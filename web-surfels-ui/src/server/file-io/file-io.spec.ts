import { FileIO } from './file-io';

describe('File IO', () => {

    const folderPath = './temp-testing-folder/';
    const filePath = folderPath + 'temp.dat';

    beforeAll(async () => {
        await FileIO.mkDir(folderPath);
    });

    test('should write data to file and read it back', async () => {
        const data = new ArrayBuffer(147);
        const view = new Uint8Array(data);
        view[0] = 42;
        view[1] = 43;
        view[7] = 44;

        await FileIO.writeFile(filePath, data);
        const fileData = await FileIO.readFile(filePath);
        const fileView = new Uint8Array(fileData);

        expect(fileView.byteLength).toEqual(view.byteLength);

        expect(fileView[0]).toEqual(42);
        expect(fileView[1]).toEqual(43);
        expect(fileView[2]).toEqual(0);
        expect(fileView[7]).toEqual(44);
    });

});
