let videoElement: HTMLVideoElement | null = null

export function setVideoElement(el: HTMLVideoElement | null): void {
  videoElement = el
}

export function getVideoElement(): HTMLVideoElement | null {
  return videoElement
}

export function buildVideoUrl(filePath: string): string {
  return `sonarlox-video://video?path=${encodeURIComponent(filePath)}`
}
