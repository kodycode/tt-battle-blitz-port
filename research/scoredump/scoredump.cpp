// scoredump: dumps cast libraries + score of a Director 8 movie (Teen Titans Battle Blitz)
// to JSON for the HTML5 port, and copies member media into public/assets.
//
// usage: scoredump <movieDir> <extractedAssetsDir> <webPublicDir> [metaBitmapsTsv]
//   movieDir            folder with game.dcr and char_*.cct
//   extractedAssetsDir  output of libreshockwave_asset_extractor (assets/<file>/manifest.tsv ...)
//   webPublicDir        public (writes data/casts.json, data/score.json, assets/...)
//   metaBitmapsTsv      optional meta/bitmaps.tsv to cross-check reg points
//
// Game files are treated purely as data. See README.md for the JSON formats.

#include <zlib.h>

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <filesystem>
#include <functional>
#include <fstream>
#include <iostream>
#include <iterator>
#include <map>
#include <memory>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

#include "libreshockwave/DirectorFile.hpp"
#include "libreshockwave/audio/SoundConverter.hpp"
#include "libreshockwave/bitmap/Bitmap.hpp"
#include "libreshockwave/bitmap/Palette.hpp"
#include "libreshockwave/cast/BitmapInfo.hpp"
#include "libreshockwave/cast/FilmLoopInfo.hpp"
#include "libreshockwave/cast/MemberType.hpp"
#include "libreshockwave/cast/ShapeInfo.hpp"
#include "libreshockwave/cast/XmedStyledText.hpp"
#include "libreshockwave/chunks/CastChunk.hpp"
#include "libreshockwave/chunks/CastListChunk.hpp"
#include "libreshockwave/chunks/CastMemberChunk.hpp"
#include "libreshockwave/chunks/ConfigChunk.hpp"
#include "libreshockwave/chunks/FrameLabelsChunk.hpp"
#include "libreshockwave/chunks/KeyTableChunk.hpp"
#include "libreshockwave/chunks/MediaChunk.hpp"
#include "libreshockwave/chunks/PaletteChunk.hpp"
#include "libreshockwave/chunks/ScoreChunk.hpp"
#include "libreshockwave/chunks/ScriptChunk.hpp"
#include "libreshockwave/chunks/ScriptNamesChunk.hpp"
#include "libreshockwave/chunks/SoundChunk.hpp"
#include "libreshockwave/chunks/TextChunk.hpp"

namespace fs = std::filesystem;
using namespace libreshockwave;
using chunks::CastMemberChunk;

// ---------------------------------------------------------------------------
// Minimal ordered JSON value
// ---------------------------------------------------------------------------
struct Json;
using JArr = std::vector<Json>;
using JObj = std::vector<std::pair<std::string, Json>>;
struct Json {
    std::variant<std::nullptr_t, bool, long long, double, std::string, JArr, JObj> v;
    Json() : v(nullptr) {}
    Json(std::nullptr_t) : v(nullptr) {}
    Json(bool b) : v(b) {}
    Json(int i) : v(static_cast<long long>(i)) {}
    Json(long long i) : v(i) {}
    Json(double d) : v(d) {}
    Json(const char* s) : v(std::string(s)) {}
    Json(std::string s) : v(std::move(s)) {}
    Json(JArr a) : v(std::move(a)) {}
    Json(JObj o) : v(std::move(o)) {}
    static Json obj() { return Json(JObj{}); }
    static Json arr() { return Json(JArr{}); }
    Json& set(const std::string& k, Json val) {
        auto& o = std::get<JObj>(v);
        for (auto& [key, existing] : o)
            if (key == k) { existing = std::move(val); return *this; }
        o.emplace_back(k, std::move(val));
        return *this;
    }
    void push(Json val) { std::get<JArr>(v).push_back(std::move(val)); }
    bool isObj() const { return std::holds_alternative<JObj>(v); }
};

static void escapeTo(std::string& out, const std::string& s) {
    out += '"';
    for (unsigned char c : s) {
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                if (c < 0x20) {
                    char buf[8];
                    std::snprintf(buf, sizeof buf, "\\u%04x", c);
                    out += buf;
                } else {
                    out += static_cast<char>(c);
                }
        }
    }
    out += '"';
}

// Pretty prints down to `prettyDepth`; deeper values are written on one line.
static void serialize(std::string& out, const Json& j, int depth, int prettyDepth) {
    const bool pretty = depth < prettyDepth;
    auto nl = [&](int d) {
        if (pretty) { out += '\n'; out.append(static_cast<size_t>(d) * 1, ' '); }
    };
    std::visit([&](auto&& x) {
        using T = std::decay_t<decltype(x)>;
        if constexpr (std::is_same_v<T, std::nullptr_t>) out += "null";
        else if constexpr (std::is_same_v<T, bool>) out += x ? "true" : "false";
        else if constexpr (std::is_same_v<T, long long>) out += std::to_string(x);
        else if constexpr (std::is_same_v<T, double>) {
            char buf[32];
            std::snprintf(buf, sizeof buf, "%.6g", x);
            out += buf;
        } else if constexpr (std::is_same_v<T, std::string>) escapeTo(out, x);
        else if constexpr (std::is_same_v<T, JArr>) {
            out += '[';
            for (size_t i = 0; i < x.size(); ++i) {
                if (i) out += ',';
                nl(depth + 1);
                serialize(out, x[i], depth + 1, prettyDepth);
            }
            if (!x.empty()) nl(depth);
            out += ']';
        } else {
            out += '{';
            for (size_t i = 0; i < x.size(); ++i) {
                if (i) out += ',';
                nl(depth + 1);
                escapeTo(out, x[i].first);
                out += ':';
                serialize(out, x[i].second, depth + 1, prettyDepth);
            }
            if (!x.empty()) nl(depth);
            out += '}';
        }
    }, j.v);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
static std::vector<std::uint8_t> readFile(const fs::path& p) {
    std::ifstream f(p, std::ios::binary);
    if (!f) throw std::runtime_error("cannot open " + p.string());
    return {std::istreambuf_iterator<char>(f), {}};
}
static void writeFile(const fs::path& p, const std::string& s) {
    fs::create_directories(p.parent_path());
    std::ofstream f(p, std::ios::binary);
    f.write(s.data(), static_cast<std::streamsize>(s.size()));
}
static void writeFile(const fs::path& p, const std::vector<std::uint8_t>& d) {
    fs::create_directories(p.parent_path());
    std::ofstream f(p, std::ios::binary);
    f.write(reinterpret_cast<const char*>(d.data()), static_cast<std::streamsize>(d.size()));
}
static int be16(const std::vector<std::uint8_t>& d, size_t o) { return (d[o] << 8) | d[o + 1]; }
static int bes16(const std::vector<std::uint8_t>& d, size_t o) { return static_cast<std::int16_t>(be16(d, o)); }
static int be32(const std::vector<std::uint8_t>& d, size_t o) {
    return static_cast<int>((static_cast<std::uint32_t>(d[o]) << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]);
}

static std::string sanitize(const std::string& s) {
    std::string r;
    bool us = false;
    for (unsigned char c : s) {
        if (std::isalnum(c) || c == '-' || c == '_') { r += static_cast<char>(c); us = false; }
        else if (!us && !r.empty()) { r += '_'; us = true; }
    }
    while (!r.empty() && r.back() == '_') r.pop_back();
    if (r.empty()) r = "member";
    if (r.size() > 80) r.resize(80);
    return r;
}

static bool validUtf8(const std::string& s) {
    size_t i = 0;
    while (i < s.size()) {
        unsigned char c = s[i];
        int n = c < 0x80 ? 0 : (c >> 5) == 6 ? 1 : (c >> 4) == 14 ? 2 : (c >> 3) == 30 ? 3 : -1;
        if (n < 0) return false;
        for (int k = 1; k <= n; ++k)
            if (i + k >= s.size() || (static_cast<unsigned char>(s[i + k]) >> 6) != 2) return false;
        i += static_cast<size_t>(n) + 1;
    }
    return true;
}
// Windows-1252 -> UTF-8 (fields in this Windows-authored movie). 0x80-0x9F mapped where defined.
static std::string cp1252ToUtf8(const std::string& s) {
    static const char16_t hi[32] = {0x20AC, 0, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160,
                                    0x2039, 0x0152, 0, 0x017D, 0, 0, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013,
                                    0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0, 0x017E, 0x0178};
    std::string r;
    for (unsigned char c : s) {
        char32_t cp = c;
        if (c >= 0x80 && c < 0xA0) cp = hi[c - 0x80] ? hi[c - 0x80] : c;
        if (cp < 0x80) r += static_cast<char>(cp);
        else if (cp < 0x800) { r += static_cast<char>(0xC0 | (cp >> 6)); r += static_cast<char>(0x80 | (cp & 0x3F)); }
        else { r += static_cast<char>(0xE0 | (cp >> 12)); r += static_cast<char>(0x80 | ((cp >> 6) & 0x3F)); r += static_cast<char>(0x80 | (cp & 0x3F)); }
    }
    return r;
}
static std::string toUtf8(std::string s) { return validUtf8(s) ? s : cp1252ToUtf8(s); }
static std::string textNormalize(std::string s) {
    while (!s.empty() && s.back() == '\0') s.pop_back();
    s = toUtf8(s);
    std::string r;
    for (size_t i = 0; i < s.size(); ++i) {
        if (s[i] == '\r') { r += '\n'; if (i + 1 < s.size() && s[i + 1] == '\n') ++i; }
        else r += s[i];
    }
    return r;
}
static std::string hexColor(std::uint32_t rgb) {
    char b[8];
    std::snprintf(b, sizeof b, "#%06x", rgb & 0xFFFFFF);
    return b;
}
static std::string typeName(cast::MemberType t, const CastMemberChunk& m) {
    using MT = cast::MemberType;
    switch (t) {
        case MT::Bitmap: return "bitmap";
        case MT::FilmLoop: return "filmloop";
        case MT::Text: return "field";  // classic text member == #field in D8
        case MT::Palette: return "palette";
        case MT::Picture: return "picture";
        case MT::Sound: return "sound";
        case MT::Button: return "button";
        case MT::Shape: return "shape";
        case MT::Movie: return "movie";
        case MT::DigitalVideo: return "digitalvideo";
        case MT::Script: return "script";
        case MT::RichText: return "richtext";
        case MT::Transition: return "transition";
        case MT::Xtra: return m.isTextXtra() ? "text" : "xtra";
        case MT::Font: return "font";
        case MT::Shockwave3D: return "shockwave3d";
        default: return "unknown";
    }
}

// ---------------------------------------------------------------------------
// PNG read (extractor output) / write (zlib, adaptive filters)
// ---------------------------------------------------------------------------
struct Rgba {
    int w = 0, h = 0;
    std::vector<std::uint8_t> px;  // RGBA rows
};

static std::optional<Rgba> readPngRgba(const fs::path& p) {
    auto d = readFile(p);
    if (d.size() < 33 || d[1] != 'P') return std::nullopt;
    size_t o = 8;
    Rgba img;
    std::vector<std::uint8_t> idat;
    while (o + 12 <= d.size()) {
        auto len = static_cast<size_t>(static_cast<std::uint32_t>(be32(d, o)));
        std::string type(d.begin() + o + 4, d.begin() + o + 8);
        if (o + 12 + len > d.size()) return std::nullopt;
        if (type == "IHDR") {
            img.w = be32(d, o + 8);
            img.h = be32(d, o + 12);
            if (d[o + 16] != 8 || d[o + 17] != 6 || d[o + 20] != 0) return std::nullopt;  // need 8-bit RGBA
        } else if (type == "IDAT") {
            idat.insert(idat.end(), d.begin() + o + 8, d.begin() + o + 8 + len);
        }
        o += 12 + len;
    }
    const size_t stride = static_cast<size_t>(img.w) * 4;
    std::vector<std::uint8_t> raw((stride + 1) * img.h);
    uLongf rawLen = static_cast<uLongf>(raw.size());
    if (uncompress(raw.data(), &rawLen, idat.data(), static_cast<uLong>(idat.size())) != Z_OK || rawLen != raw.size())
        return std::nullopt;
    img.px.resize(stride * img.h);
    for (int y = 0; y < img.h; ++y) {
        const std::uint8_t* src = &raw[y * (stride + 1)];
        std::uint8_t* dst = &img.px[y * stride];
        const std::uint8_t* prev = y ? &img.px[(y - 1) * stride] : nullptr;
        int ft = src[0];
        for (size_t x = 0; x < stride; ++x) {
            int a = x >= 4 ? dst[x - 4] : 0, b = prev ? prev[x] : 0, c = (prev && x >= 4) ? prev[x - 4] : 0;
            int v = src[1 + x];
            switch (ft) {
                case 0: break;
                case 1: v += a; break;
                case 2: v += b; break;
                case 3: v += (a + b) / 2; break;
                case 4: { int pp = a + b - c, pa = std::abs(pp - a), pb = std::abs(pp - b), pc = std::abs(pp - c);
                          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); break; }
                default: return std::nullopt;
            }
            dst[x] = static_cast<std::uint8_t>(v);
        }
    }
    return img;
}

static Rgba fromBitmap(const bitmap::Bitmap& bmp) {
    Rgba r;
    r.w = bmp.width();
    r.h = bmp.height();
    r.px.resize(static_cast<size_t>(r.w) * r.h * 4);
    const auto& p = bmp.pixels();
    for (size_t i = 0; i < p.size(); ++i) {
        r.px[i * 4] = (p[i] >> 16) & 0xFF;
        r.px[i * 4 + 1] = (p[i] >> 8) & 0xFF;
        r.px[i * 4 + 2] = p[i] & 0xFF;
        r.px[i * 4 + 3] = (p[i] >> 24) & 0xFF;
    }
    return r;
}

static std::uint32_t crcOf(const std::uint8_t* type, const std::vector<std::uint8_t>& data) {
    uLong c = crc32(0L, Z_NULL, 0);
    c = crc32(c, type, 4);
    if (!data.empty()) c = crc32(c, data.data(), static_cast<uInt>(data.size()));
    return static_cast<std::uint32_t>(c);
}
static void putBE32(std::vector<std::uint8_t>& v, std::uint32_t x) {
    v.push_back(x >> 24); v.push_back((x >> 16) & 0xFF); v.push_back((x >> 8) & 0xFF); v.push_back(x & 0xFF);
}
static void pngChunk(std::vector<std::uint8_t>& png, const char* type, const std::vector<std::uint8_t>& data) {
    putBE32(png, static_cast<std::uint32_t>(data.size()));
    png.insert(png.end(), type, type + 4);
    png.insert(png.end(), data.begin(), data.end());
    putBE32(png, crcOf(reinterpret_cast<const std::uint8_t*>(type), data));
}
static std::vector<std::uint8_t> encodePng(const Rgba& img) {
    const size_t stride = static_cast<size_t>(img.w) * 4;
    std::vector<std::uint8_t> filtered;
    filtered.reserve((stride + 1) * img.h);
    std::vector<std::uint8_t> best(stride), cand(stride);
    for (int y = 0; y < img.h; ++y) {
        const std::uint8_t* row = &img.px[y * stride];
        const std::uint8_t* prev = y ? &img.px[(y - 1) * stride] : nullptr;
        long bestScore = -1;
        int bestFt = 0;
        for (int ft = 0; ft < 5; ++ft) {
            long score = 0;
            for (size_t x = 0; x < stride; ++x) {
                int a = x >= 4 ? row[x - 4] : 0, b = prev ? prev[x] : 0, c = (prev && x >= 4) ? prev[x - 4] : 0;
                int pred = 0;
                if (ft == 1) pred = a;
                else if (ft == 2) pred = b;
                else if (ft == 3) pred = (a + b) / 2;
                else if (ft == 4) { int pp = a + b - c, pa = std::abs(pp - a), pb = std::abs(pp - b), pc = std::abs(pp - c);
                                    pred = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
                auto v = static_cast<std::uint8_t>(row[x] - pred);
                cand[x] = v;
                score += v < 128 ? v : 256 - v;
            }
            if (bestScore < 0 || score < bestScore) { bestScore = score; bestFt = ft; best = cand; }
        }
        filtered.push_back(static_cast<std::uint8_t>(bestFt));
        filtered.insert(filtered.end(), best.begin(), best.end());
    }
    uLongf clen = compressBound(static_cast<uLong>(filtered.size()));
    std::vector<std::uint8_t> comp(clen);
    compress2(comp.data(), &clen, filtered.data(), static_cast<uLong>(filtered.size()), 9);
    comp.resize(clen);
    std::vector<std::uint8_t> png{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
    std::vector<std::uint8_t> ihdr;
    putBE32(ihdr, img.w);
    putBE32(ihdr, img.h);
    ihdr.insert(ihdr.end(), {8, 6, 0, 0, 0});
    pngChunk(png, "IHDR", ihdr);
    pngChunk(png, "IDAT", comp);
    pngChunk(png, "IEND", {});
    return png;
}

// ---------------------------------------------------------------------------
// Lingo literal -> JSON (behaviour initializer property lists)
// ---------------------------------------------------------------------------
struct LingoParser {
    const std::string& s;
    size_t i = 0;
    bool ok = true;
    explicit LingoParser(const std::string& str) : s(str) {}
    void ws() { while (i < s.size() && std::isspace(static_cast<unsigned char>(s[i]))) ++i; }
    bool eat(char c) { ws(); if (i < s.size() && s[i] == c) { ++i; return true; } return false; }
    static bool identCh(char c) { return std::isalnum(static_cast<unsigned char>(c)) || c == '_'; }
    std::string ident() { size_t b = i; while (i < s.size() && identCh(s[i])) ++i; return s.substr(b, i - b); }

    // Returns value; `keyOut` receives the proplist-key form of a scalar.
    Json value(std::string* keyOut = nullptr) {
        ws();
        if (i >= s.size()) { ok = false; return nullptr; }
        char c = s[i];
        if (c == '[') return list();
        if (c == '"') {
            ++i;
            size_t b = i;
            while (i < s.size() && s[i] != '"') ++i;
            std::string str = toUtf8(s.substr(b, i - b));
            if (i < s.size()) ++i; else ok = false;
            if (keyOut) *keyOut = str;
            return str;
        }
        if (c == '#') {
            ++i;
            std::string id = ident();
            if (keyOut) *keyOut = id;
            return "#" + id;
        }
        if (std::isdigit(static_cast<unsigned char>(c)) || c == '-' || c == '.' || c == '+') {
            size_t b = i++;
            while (i < s.size() && (std::isdigit(static_cast<unsigned char>(s[i])) || s[i] == '.' || s[i] == 'e' || s[i] == 'E')) ++i;
            std::string num = s.substr(b, i - b);
            if (keyOut) *keyOut = num;
            if (num.find_first_of(".eE") != std::string::npos) return std::stod(num);
            return std::stoll(num);
        }
        if (identCh(c)) {
            size_t b = i;
            std::string id = ident();
            ws();
            if (i < s.size() && s[i] == '(') {  // point(...), rect(...), rgb(...): keep source text
                int depthP = 0;
                for (; i < s.size(); ++i) {
                    if (s[i] == '(') ++depthP;
                    else if (s[i] == ')' && --depthP == 0) { ++i; break; }
                }
                std::string raw = s.substr(b, i - b);
                if (keyOut) *keyOut = raw;
                return raw;
            }
            if (keyOut) *keyOut = id;
            std::string up = id;
            for (auto& ch : up) ch = static_cast<char>(std::toupper(static_cast<unsigned char>(ch)));
            if (up == "TRUE") return 1;
            if (up == "FALSE") return 0;
            if (up == "VOID") return nullptr;
            if (up == "EMPTY") return std::string();
            return id;  // bare identifier: keep as text
        }
        ok = false;
        return nullptr;
    }
    Json list() {
        ++i;  // '['
        if (eat(':')) { eat(']'); return Json::obj(); }
        if (eat(']')) return Json::arr();
        JArr items;
        JObj props;
        bool isProp = false, first = true;
        while (ok) {
            std::string key;
            Json v = value(&key);
            if (eat(':')) {
                if (!first && !isProp) { ok = false; break; }
                isProp = true;
                props.emplace_back(key, value());
            } else {
                if (isProp) { ok = false; break; }
                items.push_back(std::move(v));
            }
            first = false;
            if (eat(',')) continue;
            if (eat(']')) break;
            ok = false;
        }
        return isProp ? Json(std::move(props)) : Json(std::move(items));
    }
};

static Json parseLingoLiteral(const std::string& text, bool& ok) {
    LingoParser p(text);
    Json v = p.value();
    p.ws();
    ok = p.ok && p.i == text.size();
    return ok ? v : Json();
}

// ---------------------------------------------------------------------------
// Cast model
// ---------------------------------------------------------------------------
struct Manifest {  // extractor manifest of one file, keyed by CASt chunk id
    struct Row { std::string type, name, fourcc, path; };
    std::multimap<int, Row> rows;
};
static Manifest loadManifest(const fs::path& p) {
    Manifest m;
    std::ifstream f(p);
    std::string line;
    std::getline(f, line);
    while (std::getline(f, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        std::vector<std::string> c;
        std::stringstream ss(line);
        std::string cell;
        while (std::getline(ss, cell, '\t')) c.push_back(cell);
        while (c.size() < 7) c.emplace_back();
        try { m.rows.emplace(std::stoi(c[0]), Manifest::Row{c[1], c[2], c[5], c[6]}); } catch (...) {}
    }
    return m;
}

struct MemberRef {
    int castLib = 0, number = 0;
    std::shared_ptr<CastMemberChunk> chunk;
    std::string name, type;
};

struct CastLibInfo {
    int number = 0;
    std::string name, fileName, authoredPath, fileKey;  // fileKey: assets/<fileKey> extractor dir
    bool external = false;
    int minMember = 1;
    std::shared_ptr<DirectorFile> file;
    std::shared_ptr<chunks::CastChunk> cast;
    std::vector<MemberRef> members;
};

struct Stats {
    int bitmapsJpeg = 0, bitmapsEmpty = 0, idxProbed = 0, idxWhiteNon0Bitmaps = 0, idx0NotWhiteBitmaps = 0;
    int bitmaps = 0, bitmapsMapped = 0, bitmapsDecodedDirect = 0, bitmapsUnmapped = 0, bitmapsPixelSame = 0,
        bitmapsPixelDiff = 0, bitmapsWithAlpha = 0, bitmaps32 = 0;
    int sounds = 0, soundsMapped = 0, soundsDirect = 0, soundsUnmapped = 0;
    int nameMismatch = 0, dimMismatch = 0;
    std::vector<std::string> unmapped, notes;
    std::map<int, int> depthCount;
    std::map<std::string, int> paletteFixedByCast;
    int pal8WhiteDup = 0, pal8Idx0White = 0, pal8Checked = 0;
};

// (castLib, memberNumber) -> member chunk / owning file, filled before members are dumped.
static std::function<Json(int, int)> g_nameOf;
static std::map<std::pair<int, int>, std::shared_ptr<CastMemberChunk>> g_members;
static std::map<std::pair<int, int>, DirectorFile*> g_memberFile;
static bool g_patchPaletteTail = true;  // mirror LibreShockwave: black entries 246-255 -> Mac system colours

static std::shared_ptr<const bitmap::Palette> paletteFromMember(int lib, int num) {
    auto it = g_members.find({lib, num});
    if (it == g_members.end() || it->second->memberType() != cast::MemberType::Palette) return nullptr;
    DirectorFile* f = g_memberFile[{lib, num}];
    for (const auto& c : f->getLinkedChunksForMember(it->second)) {
        if (auto pc = std::dynamic_pointer_cast<chunks::PaletteChunk>(c)) {
            auto colors = pc->colors();
            if (g_patchPaletteTail && colors.size() == 256) {
                for (int k = 246; k < 256; ++k) {
                    const auto mac = bitmap::Palette::systemMacPalette().getColor(k);
                    if ((colors[k] & 0xFFFFFF) == 0 && (mac & 0xFFFFFF) != 0) colors[k] = mac;
                }
            }
            return std::make_shared<bitmap::Palette>(std::move(colors), it->second->name());
        }
    }
    return nullptr;
}

static std::string scriptTypeName(std::optional<chunks::CastMemberScriptType> t) {
    if (!t) return "unknown";
    switch (*t) {
        case chunks::CastMemberScriptType::Score: return "score";  // frame or sprite behaviour
        case chunks::CastMemberScriptType::Behavior: return "behavior";
        case chunks::CastMemberScriptType::MovieScript: return "movie";
        case chunks::CastMemberScriptType::Parent: return "parent";
        default: return "unknown";
    }
}

static int infoFlags(const CastMemberChunk& m) {
    const auto& info = m.info();
    return info.size() >= 16 ? be32(info, 12) : 0;
}

static Json memberJson(CastLibInfo& lib, MemberRef& ref, const fs::path& assetsIn, const fs::path& webPublic,
                       const Manifest& manifest, Stats& st,
                       std::map<std::pair<std::string, int>, std::tuple<std::string, int, int, int, int>>& meta,
                       int& metaChecked, int& metaMismatch) {
    auto& m = *ref.chunk;
    DirectorFile& file = *lib.file;
    Json j = Json::obj();
    j.set("number", ref.number).set("name", ref.name).set("type", ref.type).set("chunkId", m.id().value());
    const std::string stem = std::to_string(ref.number) + "_" + sanitize(ref.name);
    const std::string relDir = "assets/" + sanitize(lib.name) + "/";
    auto range = manifest.rows.equal_range(m.id().value());

    if (m.isBitmap()) {
        ++st.bitmaps;
        const int dirVer = file.config() ? file.config()->directorVersion() : 1200;
        auto bi = cast::BitmapInfo::parse(m.specificData(), dirVer);
        const int regX = bi.regX - bi.initialLeft, regY = bi.regY - bi.initialTop;
        st.depthCount[bi.bitDepth]++;
        j.set("width", bi.width).set("height", bi.height).set("regX", regX).set("regY", regY).set("bitDepth", bi.bitDepth);
        // Palette reference: raw clutId > 0 is a member number, <= 0 a built-in palette (id = raw - 1).
        const int rawClut = bi.paletteId + 1;
        Json pal = Json::obj();
        // Correct palette resolution (LibreShockwave's PaletteResolver ignores clutCastLib and takes
        // member N from the first CAS* that has a CLUT there, which is wrong in multi-cast movies).
        // clutCastLib -1 = the bitmap's own castLib; >0 = that castLib; 0 = stale reference: own
        // castLib if member N is a palette there, else the first castLib with a palette at N.
        std::shared_ptr<const bitmap::Palette> correctPal;
        if (rawClut > 0) {
            int palLib = bi.paletteCastLib > 0 ? bi.paletteCastLib : lib.number;
            std::string how = bi.paletteCastLib > 0 ? "castLib" : "ownCast";
            correctPal = paletteFromMember(palLib, rawClut);
            if (!correctPal) {
                for (const auto& [key, chunk] : g_members) {
                    if (key.second != rawClut) continue;
                    if ((correctPal = paletteFromMember(key.first, rawClut))) { palLib = key.first; how = "search"; break; }
                }
            }
            if (!correctPal) { how = "unresolved"; st.notes.push_back("palette unresolved: " + lib.name + "#" + std::to_string(ref.number) + " " + ref.name); }
            pal.set("castLib", palLib).set("member", rawClut).set("name", g_nameOf(palLib, rawClut));
            if (bi.paletteCastLib <= 0) pal.set("castLibRaw", bi.paletteCastLib);
            if (how == "search") pal.set("resolvedBy", "search");
        } else {
            correctPal = std::shared_ptr<const bitmap::Palette>(&bitmap::Palette::builtIn(rawClut - 1), [](const bitmap::Palette*) {});
            auto sym = bitmap::Palette::builtInSymbolName(rawClut - 1);
            pal.set("system", sym ? *sym : ("id" + std::to_string(rawClut - 1)));
        }
        if (bi.bitDepth <= 8) j.set("palette", pal);
        if (bi.bitDepth == 32) { ++st.bitmaps32; j.set("useAlpha", bi.useAlpha).set("alphaThreshold", bi.alphaThreshold); }

        // meta/bitmaps.tsv cross-check
        auto mk = meta.find({lib.fileKey, m.id().value()});
        if (mk != meta.end()) {
            ++metaChecked;
            auto& [mn, mw, mh, mrx, mry] = mk->second;
            if (mn != ref.name || mw != bi.width || mh != bi.height || mrx != regX || mry != regY) {
                ++metaMismatch;
                st.notes.push_back("meta mismatch " + lib.name + "#" + std::to_string(ref.number) + " " + ref.name);
            }
        }

        // Locate extractor PNG by chunk id, verify by name and dimensions.
        std::optional<Rgba> img;
        bool fromExtract = false;
        for (auto it = range.first; it != range.second; ++it) {
            if (it->second.path.rfind("bitmaps/", 0) != 0) continue;
            if (it->second.name != ref.name) { ++st.nameMismatch; continue; }
            auto png = readPngRgba(assetsIn / lib.fileKey / it->second.path);
            if (!png) continue;
            if (png->w != bi.width || png->h != bi.height) { ++st.dimMismatch; continue; }
            img = std::move(png);
            fromExtract = true;
        }
        // Independent decode for verification / fallback.
        std::optional<Rgba> direct;
        try {
            auto shared = ref.chunk;
            const bool paletted = bi.bitDepth > 1 && bi.bitDepth <= 8 && correctPal;
            auto bmp = paletted ? file.decodeBitmap(shared, correctPal.get()) : file.decodeBitmap(shared);
            if (bmp && bmp->width() == bi.width && bmp->height() == bi.height) direct = fromBitmap(*bmp);
        } catch (...) {}
        if (img && direct) {
            if (img->px == direct->px) {
                ++st.bitmapsPixelSame;
            } else {
                // Extractor used the wrong palette: the correctly-paletted decode wins.
                ++st.bitmapsPixelDiff;
                ++st.paletteFixedByCast[lib.name];
                img = std::move(direct);
                direct.reset();
            }
        }
        // Index probe for paletted images: decode with an identity palette (colour = index) to see
        // whether white pixels ever use a palette index other than 0 (matters for ink 36 / ink 8,
        // which Director evaluates on the index for paletted sources).
        if (img && bi.bitDepth <= 8 && bi.bitDepth > 1) {
            static const bitmap::Palette identity([] {
                std::vector<std::uint32_t> c(256);
                for (int k = 0; k < 256; ++k) c[k] = 0xFF000000u | static_cast<std::uint32_t>(k);
                return c;
            }(), "identity");
            try {
                auto idx = file.decodeBitmap(ref.chunk, &identity);
                if (idx && idx->width() == img->w && idx->height() == img->h) {
                    ++st.idxProbed;
                    long whiteNon0 = 0, idx0NotWhite = 0;
                    const auto& ip = idx->pixels();
                    for (size_t k = 0; k < ip.size(); ++k) {
                        const bool white = img->px[k * 4] == 255 && img->px[k * 4 + 1] == 255 && img->px[k * 4 + 2] == 255;
                        const int index = static_cast<int>(ip[k] & 0xFF);
                        if (white && index != 0) ++whiteNon0;
                        if (!white && index == 0) ++idx0NotWhite;
                    }
                    if (whiteNon0) { ++st.idxWhiteNon0Bitmaps; j.set("whitePixelsNotIndex0", static_cast<long long>(whiteNon0)); }
                    if (idx0NotWhite) {
                        ++st.idx0NotWhiteBitmaps;
                        for (size_t k = 0; k < ip.size(); ++k)
                            if ((ip[k] & 0xFF) == 0) {
                                j.set("index0Color", hexColor((img->px[k * 4] << 16) | (img->px[k * 4 + 1] << 8) | img->px[k * 4 + 2]));
                                break;
                            }
                    }
                }
            } catch (...) {}
        }
        if (!img && direct) { img = std::move(direct); ++st.bitmapsDecodedDirect; }
        // JPEG-compressed bitmaps (ediM [+ ALFA]): no JPEG decoder in this build, so ship the
        // JPEG stream as-is (browsers decode it) plus an optional alpha-mask PNG.
        std::vector<std::uint8_t> jpeg, alfa;
        if (!img) {
            for (auto it = range.first; it != range.second; ++it) {
                if (it->second.name != ref.name) continue;
                if (it->second.fourcc == "ediM") jpeg = readFile(assetsIn / lib.fileKey / it->second.path);
                if (it->second.fourcc == "ALFA") alfa = readFile(assetsIn / lib.fileKey / it->second.path);
            }
        }
        if (!img && jpeg.size() > 4 && jpeg[0] == 0xFF && jpeg[1] == 0xD8) {
            int jw = 0, jh = 0;
            for (size_t o = 2; o + 9 < jpeg.size();) {
                if (jpeg[o] != 0xFF) { ++o; continue; }
                const int mk = jpeg[o + 1];
                if (mk >= 0xC0 && mk <= 0xCF && mk != 0xC4 && mk != 0xC8 && mk != 0xCC) {
                    jh = be16(jpeg, o + 5);
                    jw = be16(jpeg, o + 7);
                    break;
                }
                o += 2 + be16(jpeg, o + 2);
            }
            if (jw == bi.width && jh == bi.height) {
                ++st.bitmapsJpeg;
                const std::string rel = relDir + stem + ".jpg";
                writeFile(webPublic / rel, jpeg);
                j.set("url", rel).set("format", "jpeg");
                Json alphaUrl;
                if (!alfa.empty()) {  // PackBits: n<128 -> n+1 literals, n>128 -> repeat next byte 257-n times
                    std::vector<std::uint8_t> a;
                    for (size_t o = 0; o < alfa.size();) {
                        const int n = alfa[o++];
                        if (n < 128) { for (int k = 0; k <= n && o < alfa.size(); ++k) a.push_back(alfa[o++]); }
                        else if (n > 128 && o < alfa.size()) { a.insert(a.end(), static_cast<size_t>(257 - n), alfa[o++]); }
                    }
                    const size_t npx = static_cast<size_t>(bi.width) * bi.height;
                    if (a.size() >= npx) {
                        a.resize(npx);
                        const bool opaque = std::all_of(a.begin(), a.end(), [](std::uint8_t v) { return v == 255; });
                        j.set("alphaOpaque", opaque);
                        if (!opaque) {
                            Rgba mask;
                            mask.w = bi.width;
                            mask.h = bi.height;
                            mask.px.resize(npx * 4, 255);
                            for (size_t k = 0; k < npx; ++k) mask.px[k * 4 + 3] = a[k];
                            const std::string arel = relDir + stem + "_alpha.png";
                            writeFile(webPublic / arel, encodePng(mask));
                            alphaUrl = arel;
                        }
                    } else {
                        st.notes.push_back("ALFA size mismatch " + ref.name);
                    }
                }
                j.set("alphaUrl", alphaUrl);
                return j;
            }
        }
        if (img) {
            if (fromExtract) ++st.bitmapsMapped;
            bool alpha = false;
            for (size_t k = 3; k < img->px.size(); k += 4)
                if (img->px[k] != 255) { alpha = true; break; }
            if (alpha) ++st.bitmapsWithAlpha;
            j.set("hasAlpha", alpha);
            const std::string rel = relDir + stem + ".png";
            writeFile(webPublic / rel, encodePng(*img));
            j.set("url", rel);
        } else if (bi.width <= 0 || bi.height <= 0) {
            ++st.bitmapsEmpty;  // 0x0 placeholder (e.g. Lingo ">> reserved for sprite manager")
            j.set("url", nullptr).set("empty", true);
        } else {
            ++st.bitmapsUnmapped;
            st.unmapped.push_back(lib.name + "#" + std::to_string(ref.number) + " " + ref.name + " (bitmap " +
                                  std::to_string(bi.width) + "x" + std::to_string(bi.height) + ")");
            j.set("url", nullptr);
        }
        // Palette white-duplication probe for 8-bit images (ink 36/8 keying concerns).
        if (bi.bitDepth == 8 && rawClut != 0) {
            const auto& p = correctPal;
            if (p) {
                ++st.pal8Checked;
                int whites = 0;
                for (int k = 0; k < p->size(); ++k) if ((p->getColor(k) & 0xFFFFFF) == 0xFFFFFF) ++whites;
                if ((p->getColor(0) & 0xFFFFFF) == 0xFFFFFF) ++st.pal8Idx0White;
                if (whites > 1) ++st.pal8WhiteDup;
            }
        }
    } else if (m.isSound()) {
        ++st.sounds;
        const int flags = infoFlags(m);
        // CASt info flags bit 0x10 is set on every one-shot sfx and clear on every music_*/*_loop member.
        j.set("loop", (flags & 0x10) == 0);
        std::string rel;
        for (auto it = range.first; it != range.second; ++it) {
            const auto& r = it->second;
            if (r.path.rfind("sounds/", 0) != 0 || r.name != ref.name) continue;
            const auto ext = fs::path(r.path).extension().string();
            rel = relDir + stem + ext;
            fs::create_directories((webPublic / rel).parent_path());
            fs::copy_file(assetsIn / lib.fileKey / r.path, webPublic / rel, fs::copy_options::overwrite_existing);
            ++st.soundsMapped;
            break;
        }
        if (rel.empty()) {
            // Direct extraction (same path as the extractor).
            auto kt = file.keyTable();
            if (kt) {
                for (const auto& e : kt->getEntriesForOwner(m.id())) {
                    auto ch = file.getChunk(e.sectionId);
                    std::optional<chunks::SoundChunk> conv;
                    const chunks::SoundChunk* snd = nullptr;
                    if (auto d = std::dynamic_pointer_cast<chunks::SoundChunk>(ch)) snd = d.get();
                    else if (auto md = std::dynamic_pointer_cast<chunks::MediaChunk>(ch)) { conv = md->toSoundChunk(); snd = &*conv; }
                    if (!snd) continue;
                    std::vector<std::uint8_t> data;
                    std::string ext = ".wav";
                    if (snd->isMp3()) {
                        auto mp3 = audio::SoundConverter::extractMp3(*snd);
                        if (!mp3) continue;
                        data = *mp3;
                        ext = ".mp3";
                    } else {
                        data = audio::SoundConverter::toWav(*snd);
                    }
                    rel = relDir + stem + ext;
                    writeFile(webPublic / rel, data);
                    ++st.soundsDirect;
                    break;
                }
            }
        }
        if (rel.empty()) {
            ++st.soundsUnmapped;
            st.unmapped.push_back(lib.name + "#" + std::to_string(ref.number) + " " + ref.name + " (sound)");
            j.set("url", nullptr);
        } else {
            j.set("url", rel);
        }
    } else if (m.memberType() == cast::MemberType::Text || m.memberType() == cast::MemberType::Button) {
        // Classic field/button: STXT text + D5+ field specific data.
        auto t = file.getTextForMember(ref.chunk);
        j.set("text", t ? textNormalize(t->text()) : std::string());
        const auto& sd = m.specificData();
        if (sd.size() >= 28) {
            const int align = bes16(sd, 4);
            j.set("alignment", align == 0 ? "left" : align == 1 ? "center" : align == -1 ? "right" : std::to_string(align));
            j.set("bgColor", hexColor((sd[6] << 16) | (sd[8] << 8) | sd[10]));
            j.set("rect", JArr{bes16(sd, 16), bes16(sd, 14), bes16(sd, 20), bes16(sd, 18)});  // left,top,right,bottom
            j.set("border", sd[0]).set("margin", sd[1]).set("boxShadow", sd[2]).set("boxType", sd[3]);
        }
        if (t && !t->runs().empty()) {
            const auto& r = t->runs().front();
            auto font = file.getFontNameForId(r.fontId);
            j.set("font", font ? Json(*font) : Json()).set("fontId", r.fontId);
            j.set("fontSize", r.fontSize).set("fontStyle", r.fontStyle);
            j.set("color", hexColor((r.colorR << 16) | (r.colorG << 8) | r.colorB));
            if (t->runs().size() > 1) j.set("styleRuns", static_cast<int>(t->runs().size()));
        }
        if (m.memberType() == cast::MemberType::Button) j.set("buttonType", sd.size() >= 30 ? be16(sd, 28) : 0);
    } else if (m.isTextXtra()) {
        auto x = file.getXmedStyledTextForMember(ref.chunk);
        if (x) {
            j.set("text", textNormalize(x->text)).set("font", x->fontName).set("fontSize", x->fontSize)
                .set("fontStyle", x->fontStyleString()).set("alignment", x->alignment)
                .set("color", hexColor((x->colorR << 16) | (x->colorG << 8) | x->colorB))
                .set("width", x->width).set("height", x->height).set("wordWrap", x->wordWrap)
                .set("antialias", x->antialias);
        }
    } else if (m.isScript()) {
        j.set("scriptType", scriptTypeName(m.getScriptType()));
        try {
            auto sc = file.getScriptForCastMember(ref.chunk);
            if (sc) {
                auto names = file.getScriptNamesForScript(sc);
                JArr handlers;
                for (const auto& h : sc->handlers()) handlers.emplace_back(sc->getHandlerName(h, names.get()));
                JArr props;
                for (const auto& p : sc->getPropertyNames(names.get())) props.emplace_back(p);
                j.set("handlers", handlers).set("properties", props);
            }
        } catch (...) {}
    } else if (m.memberType() == cast::MemberType::Shape) {
        auto s = cast::ShapeInfo::parse(m.specificData());
        j.set("shapeType", static_cast<int>(s.shapeType)).set("width", s.width).set("height", s.height)
            .set("regX", s.regX).set("regY", s.regY).set("color", s.color).set("backColor", s.backColor)
            .set("fillType", s.fillType).set("lineThickness", s.lineThickness);
    } else if (m.memberType() == cast::MemberType::Palette) {
        for (const auto& c : file.getLinkedChunksForMember(ref.chunk)) {
            if (auto pc = std::dynamic_pointer_cast<chunks::PaletteChunk>(c)) {
                JArr cols;
                for (int k = 0; k < pc->colorCount(); ++k) cols.emplace_back(hexColor(pc->getColor(k)));
                j.set("colors", cols);
                break;
            }
        }
    }
    return j;
}

// ---------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------
struct SpriteRec {  // decoded 48-byte D7+/D8 sprite channel record
    int spriteType, ink, trails, stretch, fore, back, castLib, member, listIdx, locV, locH, height, width;
    int colorFlags, blendByte, thickness, foreG, backG, foreB, backB, rot, skew;
    bool empty() const { return castLib == 0 && member == 0 && listIdx == 0; }
};
static SpriteRec readSprite(const std::vector<std::uint8_t>& d, size_t o) {
    SpriteRec r{};
    r.spriteType = d[o];
    r.ink = d[o + 1] & 0x3F;
    r.trails = (d[o + 1] >> 6) & 1;
    r.stretch = (d[o + 1] >> 7) & 1;
    r.fore = d[o + 2];
    r.back = d[o + 3];
    r.castLib = be16(d, o + 4);
    r.member = be16(d, o + 6);
    r.listIdx = be32(d, o + 8);
    r.locV = bes16(d, o + 12);
    r.locH = bes16(d, o + 14);
    r.height = be16(d, o + 16);
    r.width = be16(d, o + 18);
    r.colorFlags = d[o + 20];  // high nibble: 1 = foreColor RGB, 2 = backColor RGB; low nibble = score-window colour (cosmetic)
    r.blendByte = d[o + 21];
    // Byte 22: low nibble = line thickness (shapes), 0x20 = flipH, 0x40 = flipV, 0x10 = unknown,
    // 0x80 = set on every frame of a span except the first (not visual) -> masked off.
    r.thickness = d[o + 22] & 0x7F;
    r.foreG = d[o + 24];
    r.backG = d[o + 25];
    r.foreB = d[o + 26];
    r.backB = d[o + 27];
    r.rot = be32(d, o + 28);
    r.skew = be32(d, o + 32);
    return r;
}


struct Interval { int start, end, channel; JArr behaviors; bool used = false; };
struct Run { int from, to; SpriteRec r; };
struct Span { int channel, start, end, listIdx; std::vector<Run> runs; };
struct MainRun { int from, to; std::vector<std::uint8_t> rec; };
struct ScoreResult {
    int frameCount = 0, framesVersion = 0, recSize = 0, numChannels = 0, mainChannels = 6;
    std::map<int, Interval> intervals;
    int initParsed = 0, initFailed = 0;
    std::vector<Span> spans;
    std::vector<std::vector<MainRun>> mainRuns;
    std::map<int, int> histThickness, histInk, histBlend, histColorFlags, histSpriteType;
    int rotCount = 0, maxChannelUsed = 0, decodedFrames = 0;
    int spanIvMatch = 0, spanIvMismatch = 0, spanNoIv = 0;
    JArr spritesJ, frameScripts, paletteRuns;
    Json otherMain = Json::obj();
    int nonEmptyOtherMain = 0, ivUnused = 0;
};

// Decodes a D7+/D8 VWSC (main score or film loop score). LibreShockwave applies the D6 layout
// to framesVersion 13, but this movie uses 48-byte records with 6 main channels + N sprite channels.
static ScoreResult decodeScore(const std::vector<std::vector<std::uint8_t>>& ents,
                               const std::function<Json(int, int)>& nameOf, std::vector<std::string>& notes,
                               int selfCastLib = 0) {
    ScoreResult res;
    if (ents.size() < 2 || ents[0].size() < 20 || ents[1].size() < 4) return res;
    auto& R = res;
    auto& intervals = res.intervals;
    auto& initParsed = res.initParsed;
    auto& initFailed = res.initFailed;
    auto& spans = res.spans;
    auto& mainRuns = res.mainRuns;
    auto& histThickness = res.histThickness;
    auto& histInk = res.histInk;
    auto& histBlend = res.histBlend;
    auto& histColorFlags = res.histColorFlags;
    auto& histSpriteType = res.histSpriteType;
    auto& rotCount = res.rotCount;
    auto& maxChannelUsed = res.maxChannelUsed;
    auto& decodedFrames = res.decodedFrames;
    auto& spanIvMatch = res.spanIvMatch;
    auto& spanIvMismatch = res.spanIvMismatch;
    auto& spanNoIv = res.spanNoIv;
    auto& spritesJ = res.spritesJ;
    auto& frameScripts = res.frameScripts;
    auto& paletteRuns = res.paletteRuns;
    auto& otherMain = res.otherMain;
    auto& nonEmptyOtherMain = res.nonEmptyOtherMain;
    auto& ivUnused = res.ivUnused;
    const auto& e0 = ents.at(0);
    R.frameCount = be32(e0, 8);
    R.framesVersion = be16(e0, 12);
    R.recSize = be16(e0, 14);
    R.numChannels = be16(e0, 16);
    R.mainChannels = 6;
    const int frameCount = R.frameCount, recSize = R.recSize, numChannels = R.numChannels, mainChannels = R.mainChannels;
    (void)frameCount;
    const size_t frameBytes = static_cast<size_t>(numChannels) * recSize;


    // Interval records: entries[1] = [count, primaryEntryIndex...]; primary(44 bytes) at idx,
    // behaviour refs (8 bytes each: u16 castLib, u16 member, u32 initializerEntryIndex) at idx+1.
    const int ivCount = be32(ents.at(1), 0);
    for (int k = 1; k <= ivCount; ++k) {
        const int idx = be32(ents[1], static_cast<size_t>(k) * 4);
        if (idx <= 0 || idx >= static_cast<int>(ents.size()) || ents[idx].size() < 20) continue;
        const auto& p = ents[idx];
        Interval iv{be32(p, 0), be32(p, 4), be32(p, 16), {}};
        if (idx + 1 < static_cast<int>(ents.size())) {
            const auto& b = ents[idx + 1];
            for (size_t o = 0; o + 8 <= b.size(); o += 8) {
                const int bl = be16(b, o), bm = be16(b, o + 2), init = be32(b, o + 4);
                if (bl == 0 && bm == 0) continue;
                Json bj = Json::obj();
                bj.set("castLib", bl).set("member", bm).set("name", nameOf(bl, bm));
                if (init > 0 && init < static_cast<int>(ents.size()) && !ents[init].empty()) {
                    std::string raw(ents[init].begin(), ents[init].end());
                    while (!raw.empty() && (raw.back() == '\0' || std::isspace(static_cast<unsigned char>(raw.back())))) raw.pop_back();
                    raw = toUtf8(raw);
                    bool ok = false;
                    Json parsed = parseLingoLiteral(raw, ok);
                    bj.set("paramsRaw", raw).set("params", parsed);
                    ok ? ++initParsed : ++initFailed;
                    if (!ok) notes.push_back("unparsed initializer: " + raw);
                } else {
                    bj.set("paramsRaw", nullptr).set("params", nullptr);
                }
                iv.behaviors.push_back(std::move(bj));
            }
        }
        intervals[idx] = std::move(iv);
    }

    // Decode frame deltas, build spans.
    std::map<int, size_t> openSpan;  // raw channel -> index into spans
    mainRuns.resize(R.mainChannels);
    std::vector<std::uint8_t> cur(frameBytes, 0);
    size_t pos = 20;
    for (int f = 1; f <= frameCount && pos + 2 <= e0.size(); ++f) {
        const int len = be16(e0, pos);
        const size_t end = pos + len;
        pos += 2;
        while (pos + 4 <= end) {
            const int sz = be16(e0, pos), off = be16(e0, pos + 2);
            pos += 4;
            if (static_cast<size_t>(off) + sz <= cur.size() && pos + sz <= e0.size())
                std::copy(e0.begin() + pos, e0.begin() + pos + sz, cur.begin() + off);
            pos += sz;
        }
        pos = end;
        ++decodedFrames;
        for (int ch = 0; ch < mainChannels; ++ch) {
            std::vector<std::uint8_t> rec(cur.begin() + ch * recSize, cur.begin() + (ch + 1) * recSize);
            auto& runs = mainRuns[ch];
            if (!runs.empty() && runs.back().to == f - 1 && runs.back().rec == rec) runs.back().to = f;
            else runs.push_back({f, f, rec});
        }
        for (int ch = mainChannels; ch < numChannels; ++ch) {
            SpriteRec r = readSprite(cur, static_cast<size_t>(ch) * recSize);
            auto it = openSpan.find(ch);
            if (r.empty()) {
                if (it != openSpan.end()) openSpan.erase(it);
                continue;
            }
            maxChannelUsed = std::max(maxChannelUsed, ch - mainChannels + 1);
            histThickness[r.thickness]++;
            histInk[r.ink]++;
            histBlend[r.blendByte]++;
            histColorFlags[r.colorFlags]++;
            histSpriteType[r.spriteType]++;
            if (r.rot || r.skew) ++rotCount;
            if (it != openSpan.end() && spans[it->second].listIdx == r.listIdx && spans[it->second].end == f - 1) {
                auto& sp = spans[it->second];
                sp.end = f;
                auto& last = sp.runs.back();
                if (std::memcmp(&last.r, &r, sizeof r) == 0) last.to = f;
                else sp.runs.push_back({f, f, r});
            } else {
                spans.push_back({ch, f, f, r.listIdx, {{f, f, r}}});
                openSpan[ch] = spans.size() - 1;
            }
        }
    }

    auto blendPct = [](int b) { return b <= 0 ? 100 : b >= 255 ? 0 : static_cast<int>(std::lround((255 - b) * 100.0 / 255.0)); };
    auto colorJ = [](int idx, bool rgb, int g, int b) -> Json {
        if (rgb) return hexColor((idx << 16) | (g << 8) | b);
        return idx;
    };

    for (auto& sp : spans) {
        Json sj = Json::obj();
        sj.set("channel", sp.channel - mainChannels + 1).set("startFrame", sp.start).set("endFrame", sp.end);
        auto iv = intervals.find(sp.listIdx);
        JArr behaviors;
        if (iv != intervals.end()) {
            iv->second.used = true;
            behaviors = iv->second.behaviors;
            if (iv->second.start == sp.start && iv->second.end == sp.end && iv->second.channel == sp.channel) ++spanIvMatch;
            else ++spanIvMismatch;
        } else {
            ++spanNoIv;
        }
        sj.set("behaviors", behaviors);
        JArr states;
        for (auto& run : sp.runs) {
            const auto& r = run.r;
            Json s = Json::obj();
            // Film loops inside a cast refer to their own cast as castLib 0 / 0xFFFF.
            const int lib = (r.castLib == 0 || r.castLib == 0xFFFF) && selfCastLib > 0 && r.member ? selfCastLib : r.castLib;
            s.set("from", run.from).set("to", run.to).set("castLib", lib).set("member", r.member)
                .set("memberName", nameOf(lib, r.member)).set("locH", r.locH).set("locV", r.locV)
                .set("width", r.width).set("height", r.height).set("ink", r.ink).set("blend", blendPct(r.blendByte));
            // Raw blend byte (0 = 100%, 255 = 0%): the renderer mixes with level (0xFF00 - raw * 0x100) / 0xFF, and
            // several raw values share one rounded percentage.
            if (r.blendByte) s.set("blendRaw", r.blendByte);
            if (r.trails) s.set("trails", true);
            if (r.thickness != 1) s.set("flagsRaw", r.thickness);
            if (r.stretch) s.set("stretch", true);
            if (r.thickness & 0x20) s.set("flipH", true);
            if (r.thickness & 0x40) s.set("flipV", true);
            const bool foreRgb = (r.colorFlags >> 4) & 1, backRgb = (r.colorFlags >> 4) & 2;
            if (foreRgb || r.fore != 255) s.set("foreColor", colorJ(r.fore, foreRgb, r.foreG, r.foreB));
            if (backRgb || r.back != 0) s.set("backColor", colorJ(r.back, backRgb, r.backG, r.backB));
            if (r.rot) s.set("rotation", r.rot / 100.0);
            if (r.skew) s.set("skew", r.skew / 100.0);
            states.push_back(std::move(s));
        }
        sj.set("states", states);
        spritesJ.push_back(std::move(sj));
    }

    // Frame script channel (raw 0): u16 castLib, u16 member, u32 intervalEntryIndex.
    for (auto& run : mainRuns[0]) {
        const int lib = be16(run.rec, 0), mem = be16(run.rec, 2), li = be32(run.rec, 4);
        if (lib == 0 && mem == 0) continue;
        Json j = Json::obj();
        j.set("startFrame", run.from).set("endFrame", run.to).set("castLib", lib).set("member", mem).set("name", nameOf(lib, mem));
        auto iv = intervals.find(li);
        if (iv != intervals.end()) { iv->second.used = true; j.set("behaviors", iv->second.behaviors); }
        else j.set("behaviors", JArr{});
        frameScripts.push_back(std::move(j));
    }
    // Palette channel (raw 5): i16 castLib, i16 member, u8 rate, u8 flags, ..., u32 intervalEntryIndex @16.
    for (auto& run : mainRuns[5]) {
        const int lib = bes16(run.rec, 0), mem = bes16(run.rec, 2);
        if (lib == 0 && mem == 0) continue;
        Json j = Json::obj();
        j.set("startFrame", run.from).set("endFrame", run.to).set("castLib", lib).set("member", mem);
        if (lib > 0) j.set("name", nameOf(lib, mem));
        else if (auto sym = bitmap::Palette::builtInSymbolName(mem)) j.set("system", *sym);
        j.set("rate", run.rec[4]).set("flags", run.rec[5]);
        auto iv = intervals.find(be32(run.rec, 16));
        if (iv != intervals.end()) iv->second.used = true;
        paletteRuns.push_back(std::move(j));
    }
    // Main channels 1-4 (tempo / transition / sound1 / sound2): emitted raw if ever non-zero.
    for (int ch = 1; ch <= 4; ++ch) {
        JArr arr;
        for (auto& run : mainRuns[ch]) {
            if (std::all_of(run.rec.begin(), run.rec.end(), [](std::uint8_t b) { return b == 0; })) continue;
            std::string hex;
            char b[3];
            for (auto by : run.rec) { std::snprintf(b, 3, "%02x", by); hex += b; }
            arr.push_back(Json(JObj{{"startFrame", run.from}, {"endFrame", run.to}, {"rawHex", hex}}));
            ++nonEmptyOtherMain;
        }
        otherMain.set("raw" + std::to_string(ch), arr);
    }
    for (auto& [k, iv] : intervals) if (!iv.used) ++ivUnused;

    return res;
}

int main(int argc, char** argv) {
    if (argc < 4) {
        std::cerr << "usage: scoredump <movieDir> <extractedAssetsDir> <webPublicDir> [metaBitmapsTsv]\n";
        return 2;
    }
    const fs::path movieDir = argv[1], assetsIn = argv[2], webPublic = argv[3];
    std::map<std::pair<std::string, int>, std::tuple<std::string, int, int, int, int>> meta;
    if (argc > 4) {
        std::ifstream f(argv[4]);
        std::string line;
        std::getline(f, line);
        while (std::getline(f, line)) {
            if (!line.empty() && line.back() == '\r') line.pop_back();
            std::vector<std::string> c;
            std::stringstream ss(line);
            std::string cell;
            while (std::getline(ss, cell, '\t')) c.push_back(cell);
            if (c.size() < 7) continue;
            meta[{c[0], std::stoi(c[1])}] = {c[2], std::stoi(c[3]), std::stoi(c[4]), std::stoi(c[5]), std::stoi(c[6])};
        }
    }

    auto game = DirectorFile::load(readFile(movieDir / "game.dcr"));
    game->setBasePath(movieDir.string());
    auto cfg = game->config();
    auto castList = game->castList();
    auto kt = game->keyTable();
    if (!castList || !kt || !cfg) { std::cerr << "missing MCsL/KEY*/VWCF\n"; return 1; }

    // Map CAS* chunks to cast libraries via the key table (owner == MCsL entry id).
    std::map<int, std::shared_ptr<chunks::CastChunk>> castByOwner;
    for (auto& c : game->casts()) {
        if (auto owner = kt->getOwnerCastId(c->id())) castByOwner[owner->value()] = c;
    }

    std::vector<CastLibInfo> libs;
    std::map<std::string, Manifest> manifests;
    for (size_t idx = 0; idx < castList->entries().size(); ++idx) {
        const auto& e = castList->entries()[idx];
        CastLibInfo lib;
        lib.number = static_cast<int>(idx) + 1;
        lib.name = e.name;
        lib.authoredPath = e.path;
        lib.external = !e.path.empty();
        if (!lib.external) {
            lib.file = game;
            lib.fileKey = "game";
            lib.minMember = e.minMember > 0 ? e.minMember : 1;
            auto it = castByOwner.find(e.id);
            if (it != castByOwner.end()) lib.cast = it->second;
        } else {
            // The game swaps castLib(n).fileName to "<name>.cct" at runtime (see DEBUG movie script).
            lib.fileName = e.name + ".cct";
            lib.fileKey = e.name;
            const auto path = movieDir / lib.fileName;
            if (fs::exists(path)) {
                lib.file = DirectorFile::load(readFile(path));
                lib.file->setBasePath(movieDir.string());
                if (!lib.file->casts().empty()) lib.cast = lib.file->casts().front();
                auto ecl = lib.file->castList();
                if (ecl && !ecl->entries().empty() && ecl->entries()[0].minMember > 0) lib.minMember = ecl->entries()[0].minMember;
                else if (lib.file->config() && lib.file->config()->minMember() > 0) lib.minMember = lib.file->config()->minMember();
            }
        }
        if (lib.file && lib.cast) {
            std::unordered_map<int, std::shared_ptr<CastMemberChunk>> byId;
            for (auto& m : lib.file->castMembers()) byId[m->id().value()] = m;
            const auto& ids = lib.cast->memberIds();
            for (size_t k = 0; k < ids.size(); ++k) {
                auto it = byId.find(ids[k]);
                if (ids[k] <= 0 || it == byId.end()) continue;
                MemberRef r;
                r.castLib = lib.number;
                r.number = lib.minMember + static_cast<int>(k);
                r.chunk = it->second;
                r.name = toUtf8(it->second->name());
                r.type = typeName(it->second->memberType(), *it->second);
                lib.members.push_back(std::move(r));
            }
        }
        if (!manifests.count(lib.fileKey) && fs::exists(assetsIn / lib.fileKey / "manifest.tsv"))
            manifests[lib.fileKey] = loadManifest(assetsIn / lib.fileKey / "manifest.tsv");
        libs.push_back(std::move(lib));
    }

    // ---- casts.json
    Stats st;
    int metaChecked = 0, metaMismatch = 0;
    int filmLoops = 0, filmLoopSpans = 0, filmLoopSpanMismatch = 0, filmLoopUnresolved = 0, filmLoopNoScore = 0;
    Json castsJson = Json::obj();
    castsJson.set("format", "tt-casts/1");
    JArr libsJ;
    std::map<std::pair<int, int>, std::string> memberNames;
    for (auto& lib : libs)
        for (auto& r : lib.members) {
            memberNames[{lib.number, r.number}] = r.name;
            g_members[{lib.number, r.number}] = r.chunk;
            g_memberFile[{lib.number, r.number}] = lib.file.get();
        }
    if (const char* np = std::getenv("SCOREDUMP_NO_PALETTE_PATCH"); np && *np == '1') g_patchPaletteTail = false;
    g_nameOf = [&](int lib, int mem) -> Json {
        auto it = memberNames.find({lib, mem});
        return it != memberNames.end() ? Json(it->second) : Json();
    };
    for (auto& lib : libs) {
        Json lj = Json::obj();
        lj.set("number", lib.number).set("name", lib.name).set("external", lib.external);
        lj.set("fileName", lib.external ? Json(lib.fileName) : Json());
        if (lib.external) lj.set("authoredPath", lib.authoredPath);
        lj.set("loaded", static_cast<bool>(lib.cast));
        lj.set("minMember", lib.minMember);
        JArr ms;
        static const Manifest empty;
        const auto mit = manifests.find(lib.fileKey);
        const Manifest& man = mit != manifests.end() ? mit->second : empty;
        for (auto& r : lib.members) {
            Json mj = memberJson(lib, r, assetsIn, webPublic, man, st, meta, metaChecked, metaMismatch);
            if (r.chunk->memberType() == cast::MemberType::FilmLoop) {
                ++filmLoops;
                const auto fi = cast::FilmLoopInfo::parse(r.chunk->specificData());
                // Reg point = centre of the loop rect (matches score placement; ScummVM does the same).
                mj.set("width", fi.width()).set("height", fi.height()).set("regX", fi.width() / 2).set("regY", fi.height() / 2);
                Json fl = Json::obj();
                fl.set("rect", JArr{fi.rectLeft, fi.rectTop, fi.rectRight, fi.rectBottom})
                    .set("center", fi.center).set("crop", fi.crop).set("sound", fi.sound).set("loops", fi.loops);
                auto fsc = lib.file->getScoreForMember(r.chunk);
                if (fsc) {
                    ScoreResult fr = decodeScore(fsc->entries(), g_nameOf, st.notes, lib.number);
                    fl.set("frameCount", fr.frameCount).set("sprites", fr.spritesJ);
                    if (!fr.frameScripts.empty()) fl.set("frameScripts", fr.frameScripts);
                    if (fr.nonEmptyOtherMain) fl.set("otherMainChannelsRaw", fr.otherMain);
                    filmLoopSpans += static_cast<int>(fr.spans.size());
                    filmLoopSpanMismatch += fr.spanIvMismatch + fr.spanNoIv;
                    if (fr.frameCount == 0 || fr.recSize != 48)
                        st.notes.push_back("film loop " + r.name + " frames=" + std::to_string(fr.frameCount) +
                                           " recSize=" + std::to_string(fr.recSize));
                    for (const auto& sp : fr.spritesJ)
                        for (const auto& stt : std::get<JArr>(std::get<JObj>(sp.v).back().second.v)) {
                            const auto& o = std::get<JObj>(stt.v);
                            for (const auto& [k, v] : o)
                                if (k == "memberName" && std::holds_alternative<std::nullptr_t>(v.v)) ++filmLoopUnresolved;
                        }
                } else {
                    ++filmLoopNoScore;
                }
                mj.set("filmLoop", fl);
            }
            ms.push_back(std::move(mj));
        }
        lj.set("memberCount", static_cast<int>(lib.members.size()));
        lj.set("members", ms);
        libsJ.push_back(std::move(lj));
    }
    castsJson.set("castLibs", libsJ);
    std::string out;
    serialize(out, castsJson, 0, 4);
    writeFile(webPublic / "data" / "casts.json", out);

    // ---- score.json
    auto nameOf = [&](int lib, int mem) -> Json {
        auto it = memberNames.find({lib, mem});
        return it != memberNames.end() ? Json(it->second) : Json();
    };
    ScoreResult res = decodeScore(game->scoreChunk()->entries(), nameOf, st.notes);
    auto& frameCount = res.frameCount; auto& framesVersion = res.framesVersion; auto& recSize = res.recSize;
    auto& numChannels = res.numChannels; auto& mainChannels = res.mainChannels; auto& decodedFrames = res.decodedFrames;
    auto& maxChannelUsed = res.maxChannelUsed; auto& frameScripts = res.frameScripts; auto& paletteRuns = res.paletteRuns;
    auto& otherMain = res.otherMain; auto& spritesJ = res.spritesJ; auto& spans = res.spans; auto& intervals = res.intervals;
    auto& ivUnused = res.ivUnused; auto& spanIvMatch = res.spanIvMatch; auto& spanIvMismatch = res.spanIvMismatch;
    auto& spanNoIv = res.spanNoIv; auto& initParsed = res.initParsed; auto& initFailed = res.initFailed;
    auto& nonEmptyOtherMain = res.nonEmptyOtherMain; auto& rotCount = res.rotCount;
    auto& histInk = res.histInk; auto& histBlend = res.histBlend; auto& histThickness = res.histThickness;
    auto& histColorFlags = res.histColorFlags; auto& histSpriteType = res.histSpriteType;
    Json score = Json::obj();
    score.set("format", "tt-score/1");
    const int sw = cfg->stageRight() - cfg->stageLeft(), shh = cfg->stageBottom() - cfg->stageTop();
    score.set("stage", Json(JObj{{"width", sw}, {"height", shh}, {"left", cfg->stageLeft()}, {"top", cfg->stageTop()},
                                 {"bgColor", hexColor(cfg->stageColorRGB())}}));
    score.set("tempo", Json(JObj{{"configTempo", cfg->tempo()},
                                 {"note", "puppetTempo(999) in Global_Main; Class_Globals.FRAME_RATE = 30 throttles the game loop. Score tempo channel is empty."}}));
    score.set("frameCount", frameCount).set("decodedFrames", decodedFrames).set("framesVersion", framesVersion)
        .set("spriteRecordSize", recSize).set("spriteChannelCount", numChannels - mainChannels)
        .set("maxSpriteChannelUsed", maxChannelUsed);
    Json labels = Json::obj();
    JArr labelList;
    if (auto lb = game->frameLabelsChunk()) {
        for (auto& l : lb->labels()) {
            labels.set(toUtf8(l.label), l.frameNum.value());
            labelList.push_back(Json(JObj{{"frame", l.frameNum.value()}, {"name", toUtf8(l.label)}}));
        }
    }
    score.set("labels", labels).set("labelList", labelList);
    score.set("frameScripts", frameScripts).set("palettes", paletteRuns);
    score.set("tempoChannel", JArr{}).set("sound1", JArr{}).set("sound2", JArr{}).set("transitions", JArr{});
    score.set("otherMainChannelsRaw", otherMain);
    score.set("sprites", spritesJ);
    out.clear();
    serialize(out, score, 0, 2);
    writeFile(webPublic / "data" / "score.json", out);

    // ---- report
    std::cout << "castLibs=" << libs.size() << "\n";
    int totalMembers = 0;
    for (auto& l : libs) {
        totalMembers += static_cast<int>(l.members.size());
        std::cout << "  #" << l.number << " " << l.name << " members=" << l.members.size()
                  << (l.external ? " external " + l.fileName : "") << (l.cast ? "" : " (NOT LOADED)") << "\n";
    }
    std::cout << "members total=" << totalMembers << "\n";
    std::cout << "bitmaps=" << st.bitmaps << " mappedFromExtract=" << st.bitmapsMapped
              << " decodedDirect=" << st.bitmapsDecodedDirect << " jpeg=" << st.bitmapsJpeg
              << " empty0x0=" << st.bitmapsEmpty << " unmapped=" << st.bitmapsUnmapped
              << " extractVsDirect same=" << st.bitmapsPixelSame << " diff=" << st.bitmapsPixelDiff
              << " withAlpha=" << st.bitmapsWithAlpha << " 32bit=" << st.bitmaps32 << "\n";
    std::cout << "  depths:";
    for (auto& [d, c] : st.depthCount) std::cout << " " << d << "bpp=" << c;
    std::cout << "\n  8bit palettes checked=" << st.pal8Checked << " idx0White=" << st.pal8Idx0White
              << " paletteHasDuplicateWhite=" << st.pal8WhiteDup << "\n"
              << "  index probe (2-8bpp): probed=" << st.idxProbed << " bitmapsWithWhiteAtNonZeroIndex="
              << st.idxWhiteNon0Bitmaps << " bitmapsWithIndex0NotWhite=" << st.idx0NotWhiteBitmaps << "\n";
    std::cout << "  re-decoded with corrected palette (differs from extractor PNG):";
    for (auto& [n, c] : st.paletteFixedByCast) std::cout << " " << n << "=" << c;
    std::cout << "\n";
    std::cout << "sounds=" << st.sounds << " mappedFromExtract=" << st.soundsMapped << " direct=" << st.soundsDirect
              << " unmapped=" << st.soundsUnmapped << "\n";
    std::cout << "manifest name mismatches=" << st.nameMismatch << " dim mismatches=" << st.dimMismatch << "\n";
    std::cout << "filmLoops=" << filmLoops << " noScore=" << filmLoopNoScore << " spans=" << filmLoopSpans
              << " spanIntervalMismatch=" << filmLoopSpanMismatch << " unresolvedMemberRefs=" << filmLoopUnresolved << "\n";
    std::cout << "meta/bitmaps.tsv checked=" << metaChecked << " mismatches=" << metaMismatch << "\n";
    std::cout << "score frames=" << frameCount << " decoded=" << decodedFrames << " channels=" << numChannels
              << " recSize=" << recSize << " spans=" << spans.size() << " maxSpriteChannel=" << maxChannelUsed << "\n";
    std::cout << "  intervals=" << intervals.size() << " unused=" << ivUnused << " spanMatch=" << spanIvMatch
              << " spanMismatch=" << spanIvMismatch << " spanNoInterval=" << spanNoIv << "\n";
    std::cout << "  initializers parsed=" << initParsed << " failed=" << initFailed
              << " frameScriptRuns=" << frameScripts.size() << " paletteRuns=" << paletteRuns.size()
              << " otherMainNonEmpty=" << nonEmptyOtherMain << " rotSkewRecords=" << rotCount << "\n";
    auto dumpHist = [](const char* n, const std::map<int, int>& h) {
        std::cout << "  hist " << n << ":";
        for (auto& [k, v] : h) std::cout << " " << k << "=" << v;
        std::cout << "\n";
    };
    dumpHist("ink", histInk);
    dumpHist("blendByte", histBlend);
    dumpHist("thickness", histThickness);
    dumpHist("colorFlags", histColorFlags);
    dumpHist("spriteType", histSpriteType);
    for (auto& u : st.unmapped) std::cout << "UNMAPPED " << u << "\n";
    for (auto& n : st.notes) std::cout << "NOTE " << n << "\n";
    return 0;
}
