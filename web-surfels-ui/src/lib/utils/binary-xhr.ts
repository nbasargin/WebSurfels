/**
 * Utility class to send XMLHttpRequests to get binary data.
 */
export class BinaryXHR {

    static get(url: string): Promise<ArrayBuffer> {
        return new Promise<ArrayBuffer>((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.open('GET', url, true);
            req.responseType = 'arraybuffer';
            req.onerror = e => reject(e);
            req.onload = () => {
                if (req.response && req.status === 200) {
                    resolve(req.response);
                } else {
                    reject( `Request to '${url}' failed with error code ${req.status}`);
                }
            };
            req.send();
        });
    }

}
