export interface Clock { request(callback: FrameRequestCallback): number; cancel(id: number): void }
