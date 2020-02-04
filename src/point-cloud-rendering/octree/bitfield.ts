export class Bitfield {

    private readonly bits: Uint8Array;

    constructor(public readonly size: number) {
        const bytes = Math.ceil(size / 8);
        this.bits = new Uint8Array(bytes);
    }

    getBit(pos: number): boolean {
        const byte = Math.floor(pos / 8);
        const bit = pos - byte * 8;
        const field = this.bits[byte];
        return !!(field & (1 << bit));
    }

    setBit(pos: number, value: boolean) {
        const byte = Math.floor(pos / 8);
        const bit = pos - byte * 8;
        const field = this.bits[byte];
        if (value) {
            this.bits[byte] = field | (1 << bit);
        } else {
            this.bits[byte] = field & (~(1 << bit));
        }
    }

}
