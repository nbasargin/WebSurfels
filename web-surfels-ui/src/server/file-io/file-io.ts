import { promises as fs} from 'fs';

export class FileIO {

    static mkDir(path: string): Promise<void> {
        return fs.mkdir(path, {recursive: true});
    }

    static writeFile(path: string, data: ArrayBuffer): Promise<void> {
        const buffer = Buffer.from(data);
        return fs.writeFile(path, buffer);
    }

    static readFile(path): Promise<ArrayBuffer> {
        return fs.readFile(path).then(buffer => {
            const view = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
            return view.slice(0, buffer.length).buffer;
        });
    }

}