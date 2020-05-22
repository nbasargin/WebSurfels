import { StreetViewApi } from './street-view-api';
import { StreetViewApiResponse } from './street-view-api-response';

export class GoogleStreetViewApi implements StreetViewApi {

    // ID like 'GTKQkr3G-rRZQisDUMzUtg'
    async loadDataById(panoID: string): Promise<StreetViewApiResponse> {
        const url = `https://maps.google.com/cbk?output=json&panoid=${panoID}&dm=1`;
        const response = await fetch(url);
        return response.json();
    }

    // Location like 40.762475, -73.974363
    async loadDataByLocation(lat: number, lng: number): Promise<StreetViewApiResponse> {
        const url = `https://maps.google.com/cbk?output=json&ll=${lat},${lng}&dm=1`;
        const response = await fetch(url);
        return response.json();
    }

    async loadImage(panoID: string, zoom: number, x: number, y: number): Promise<ImageBitmap> {
        const url = `https://maps.google.com/cbk?output=tile&panoid=${panoID}&zoom=${zoom}&x=${x}&y=${y}`;
        const response = await fetch(url);
        const blob = await response.blob();
        return createImageBitmap(blob);
    }

}
