// Port of Class_NetPreloader. The original streamed external casts (.cct/.cst) with preloadNetThing and
// polled getStreamStatus. The port always runs as the standalone Projector build with every cast already
// loaded, so this is a minimal faithful port whose stream reports "Complete" immediately: update() returns 1
// on its first call, netDone() is always true and there is never anything to abort.

// Stand-in for the moviePath & movieName comparison in startStream.
// TODO(runtime): `the moviePath` / `the movieName` are not provided by the runtime.
const MOVIE_PATH_AND_NAME = 'game.dir';

type StreamStatus = { URL: string; state: string; bytesSoFar: number; bytesTotal: number; error: string };

// getStreamStatus(url): every stream is already complete in the projector port.
function getStreamStatus(url: string): StreamStatus {
  return { URL: url, state: 'Complete', bytesSoFar: 1, bytesTotal: 1, error: 'OK' };
}

// preloadNetThing(url): no network; returns a net ID that is already done.
let nextNetID = 1;
function preloadNetThing(_url: string): number {
  return nextNetID++;
}

// netDone(id): every operation has completed.
function netDone(_id: number | undefined): number {
  return 1;
}

export class Class_NetPreloader {
  netID: number | undefined;
  url: string;
  status: StreamStatus;
  done: any;

  constructor(urlString: string) {
    // ORIGINAL BUG: sets a local `isDone` instead of the `done` property, so `done` stays VOID until update().
    const isDone = 0;
    void isDone;
    this.url = urlString;
    this.startStream();
    this.status = getStreamStatus(this.url);
  }

  destroy(): undefined {
    if (!netDone(this.netID)) {
      // netAbort(netID): nothing is ever in flight in the projector port.
    }
    return undefined;
  }

  startStream(): void {
    if (this.url !== String(MOVIE_PATH_AND_NAME)) {
      this.netID = preloadNetThing(this.url);
    }
    this.status = getStreamStatus(this.url);
  }

  update(): any {
    this.status = getStreamStatus(this.url);
    this.done = this.status.state === 'Complete' ? 1 : 0;
    return this.done;
  }

  getState(): string {
    return this.status.state;
  }

  getRatioLoaded(): number {
    if (this.status.bytesTotal === 0) {
      return 0.0;
    } else {
      return this.status.bytesSoFar / this.status.bytesTotal;
    }
  }

  getBytesTotal(): number {
    return this.status.bytesTotal;
  }

  getBytesLoaded(): number {
    return this.status.bytesSoFar;
  }

  GetUrl(): string {
    return this.url;
  }

  isDone(): any {
    return this.done;
  }
}
