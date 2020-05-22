import { GoogleStreetViewApi } from '../lib/data/street-view/api/google-street-view-api';

// @ts-ignore
global.fetch = require('node-fetch');

(async function main() {
    const panoID = 'h--IJXCoiMfBaHbDmPPKKg';
    const api = new GoogleStreetViewApi();
    const pano1 = await api.loadDataById(panoID);
    console.log('loaded by id', pano1);
})();



