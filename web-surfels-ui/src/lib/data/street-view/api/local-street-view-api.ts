import { StreetViewApi } from './street-view-api';
import { StreetViewApiResponse } from './street-view-api-response';

export class LocalStreetViewApi implements StreetViewApi {

    constructor(public baseUrl: string = 'http://localhost:5000/test-crawl/') {
        if (baseUrl.slice(-1) !== '/') {
            this.baseUrl += '/';
        }
    }

    async loadDataById(panoID: string): Promise<StreetViewApiResponse> {
        const url = this.baseUrl + panoID + '.json';
        const response = await fetch(url);
        return response.json();
    }

    async loadDataByLocation(lat: number, lng: number): Promise<StreetViewApiResponse> {
        throw new Error('Loading by location is not supported with a local API');
    }

    async loadImage(panoID: string, zoom: number, x: number, y: number): Promise<ImageBitmap> {
        const url = this.baseUrl + panoID + '.jpg';
        const response = await fetch(url);
        const blob = await response.blob();
        return createImageBitmap(blob);
    }

}
