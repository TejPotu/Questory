// audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = new Int16Array(2048);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];
            for (let i = 0; i < channelData.length; i++) {
                // Convert Float32 [-1, 1] to Int16 [-32768, 32767]
                let s = Math.max(-1, Math.min(1, channelData[i]));
                this.buffer[this.bufferIndex++] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                if (this.bufferIndex >= this.buffer.length) {
                    this.port.postMessage(this.buffer);
                    this.buffer = new Int16Array(2048);
                    this.bufferIndex = 0;
                }
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
