export class BinaryXHR {

    static get(url: string) {
        return new Promise<ArrayBuffer>((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.open('GET', url, true);
            req.responseType = 'arraybuffer';
            req.onerror = e => reject(e);
            req.onload = () => {
                const buffer = req.response;
                if (buffer) {
                    resolve(buffer);
                } else {
                    reject('no response');
                }
            };
            req.send();
        });
    }

}
