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
  async decodeAudio(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Trình duyệt không hỗ trợ Web Audio Context');
    }

    const audioCtx = new AudioContextClass();
    try {
      // Create a copy of the buffer because decodeAudioData detaches the input ArrayBuffer
      const copy = arrayBuffer.slice(0);
      return await audioCtx.decodeAudioData(copy);
    } finally {
      if (audioCtx.state !== 'closed') {
        void audioCtx.close();
      }
    }
  }

  /**
   * Encode an AudioBuffer into a standard MP3 (192 kbps) Blob
   */
  encodeToMp3(
    audioBuffer: AudioBuffer,
    kbps = 192,
    onProgress?: (percent: number) => void
  ): Blob {
    const channels = Math.min(2, audioBuffer.numberOfChannels);
    const sampleRate = audioBuffer.sampleRate;
    const mp3Encoder = new Mp3Encoder(channels, sampleRate, kbps);

    const leftData = this.floatToInt16(audioBuffer.getChannelData(0));
    const rightData =
      channels > 1 ? this.floatToInt16(audioBuffer.getChannelData(1)) : undefined;

    const mp3Chunks: Uint8Array[] = [];
    const sampleBlockSize = 1152;
    const totalSamples = leftData.length;

    for (let i = 0; i < totalSamples; i += sampleBlockSize) {
      const leftChunk = leftData.subarray(i, i + sampleBlockSize);
      const rightChunk = rightData
        ? rightData.subarray(i, i + sampleBlockSize)
        : undefined;

      const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Chunks.push(mp3buf);
      }

      if (onProgress && i % (sampleBlockSize * 20) === 0) {
        onProgress(Math.round((i / totalSamples) * 100));
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
   * Encode an AudioBuffer into an uncompressed 16-bit PCM WAV Blob
   */
  encodeToWav(audioBuffer: AudioBuffer): Blob {
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

    // Write interleaved 16-bit PCM samples
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      // Left channel
      const sLeft = Math.max(-1, Math.min(1, left[i]));
      view.setInt16(offset, sLeft < 0 ? sLeft * 0x8000 : sLeft * 0x7fff, true);
      offset += 2;

      // Right channel
      if (right) {
        const sRight = Math.max(-1, Math.min(1, right[i]));
        view.setInt16(offset, sRight < 0 ? sRight * 0x8000 : sRight * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
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
    return this.encodeToMp3(audioBuffer, kbps, onProgress);
  }

  /**
   * Convert any audio Blob to standard WAV
   */
  async convertBlobToWav(blob: Blob): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.decodeAudio(arrayBuffer);
    return this.encodeToWav(audioBuffer);
  }
}

export const audioConverter = new AudioConverter();
