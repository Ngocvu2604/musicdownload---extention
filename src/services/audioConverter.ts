import { Mp3Encoder } from '@breezystack/lamejs';

/**
 * AudioFlow Universal Audio Converter Engine
 *
 * Converts any browser-supported audio stream (AAC, M4A, OGG, OPUS, WAV)
 * into a 100% standard, universal MP3 (192 kbps) or WAV file.
 */

export class AudioConverter {
  /**
   * Convert Float32Array PCM samples (-1.0 to 1.0) to 16-bit signed integers (-32768 to 32767)
   */
  private floatToInt16(samples: Float32Array): Int16Array {
    const len = samples.length;
    const output = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  /**
   * Decode an AAC / M4A / WebM / OGG ArrayBuffer into an AudioBuffer using the browser's native decoder
   */
  async decodeAudio(arrayBuffer: ArrayBuffer, timeoutMs = 8000): Promise<AudioBuffer> {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Trình duyệt không hỗ trợ Web Audio Context');
    }

    const audioCtx = new AudioContextClass();
    try {
      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch {}
      }
      // Create a copy of the buffer because decodeAudioData detaches the input ArrayBuffer
      const copy = arrayBuffer.slice(0);
      return await new Promise<AudioBuffer>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Giải mã âm thanh quá thời gian chờ (Timeout)'));
        }, timeoutMs);

        audioCtx.decodeAudioData(
          copy,
          (buf) => {
            clearTimeout(timer);
            resolve(buf);
          },
          (err) => {
            clearTimeout(timer);
            reject(err || new Error('Không thể giải mã dữ liệu âm thanh'));
          }
        );
      });
    } finally {
      if (audioCtx.state !== 'closed') {
        void audioCtx.close();
      }
    }
  }

  /**
   * Encode an AudioBuffer into a standard MP3 (192 kbps) Blob asynchronously without blocking UI
   */
  async encodeToMp3(
    audioBuffer: AudioBuffer,
    kbps = 192,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const channels = Math.min(2, audioBuffer.numberOfChannels);
    const sampleRate = audioBuffer.sampleRate;
    const mp3Encoder = new Mp3Encoder(channels, sampleRate, kbps);

    const leftData = this.floatToInt16(audioBuffer.getChannelData(0));
    const rightData =
      channels > 1 ? this.floatToInt16(audioBuffer.getChannelData(1)) : undefined;

    const mp3Chunks: Uint8Array[] = [];
    const sampleBlockSize = 1152;
    const totalSamples = leftData.length;
    let lastYield = Date.now();

    for (let i = 0; i < totalSamples; i += sampleBlockSize) {
      const leftChunk = leftData.subarray(i, i + sampleBlockSize);
      const rightChunk = rightData
        ? rightData.subarray(i, i + sampleBlockSize)
        : undefined;

      const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Chunks.push(mp3buf);
      }

      const now = Date.now();
      if (now - lastYield > 40) {
        lastYield = now;
        if (onProgress) {
          onProgress(Math.round((i / totalSamples) * 100));
        }
        // Yield to browser event loop to prevent UI freezing
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    const endBuf = mp3Encoder.flush();
    if (endBuf.length > 0) {
      mp3Chunks.push(endBuf);
    }

    if (onProgress) {
      onProgress(100);
    }

    return new Blob(mp3Chunks as any, { type: 'audio/mpeg' });
  }

  /**
   * Encode an AudioBuffer into an uncompressed 16-bit PCM WAV Blob asynchronously with high performance
   */
  async encodeToWav(
    audioBuffer: AudioBuffer,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const left = audioBuffer.getChannelData(0);
    const right = numChannels > 1 ? audioBuffer.getChannelData(1) : null;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const numSamples = audioBuffer.length;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, format, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // High performance typed array PCM interleaving
    const pcm = new Int16Array(arrayBuffer, 44);
    const chunkSize = 32768;
    let lastYield = Date.now();

    for (let i = 0; i < numSamples; i++) {
      const sLeft = Math.max(-1, Math.min(1, left[i]));
      const leftInt = sLeft < 0 ? sLeft * 0x8000 : sLeft * 0x7fff;

      if (right) {
        const sRight = Math.max(-1, Math.min(1, right[i]));
        const rightInt = sRight < 0 ? sRight * 0x8000 : sRight * 0x7fff;
        pcm[i * 2] = leftInt;
        pcm[i * 2 + 1] = rightInt;
      } else {
        pcm[i] = leftInt;
      }

      if (i % chunkSize === 0) {
        const now = Date.now();
        if (now - lastYield > 40) {
          lastYield = now;
          if (onProgress) {
            onProgress(Math.round((i / numSamples) * 100));
          }
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    }

    if (onProgress) {
      onProgress(100);
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Convert any audio Blob (AAC/M4A/etc.) to standard MP3
   */
  async convertBlobToMp3(
    blob: Blob,
    kbps = 192,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.decodeAudio(arrayBuffer);
    return await this.encodeToMp3(audioBuffer, kbps, onProgress);
  }

  /**
   * Convert any audio Blob to standard WAV
   */
  async convertBlobToWav(
    blob: Blob,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.decodeAudio(arrayBuffer);
    return await this.encodeToWav(audioBuffer, onProgress);
  }
}

export const audioConverter = new AudioConverter();

