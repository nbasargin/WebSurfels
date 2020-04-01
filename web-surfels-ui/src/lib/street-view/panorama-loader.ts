import { GSVApiResponse } from './gsv-api-response';

export class PanoramaLoader {

    // ID like 'GTKQkr3G-rRZQisDUMzUtg'
    public static async loadById(panoID: string): Promise<GSVApiResponse> {
        const url = `http://maps.google.com/cbk?output=json&panoid=${panoID}&dm=1`;
        const response = await fetch(url);
        return response.json();
    }

    // Location like 40.762475, -73.974363
    public static async loadByLocation(lat: number, lng: number): Promise<GSVApiResponse> {
        const url = `http://maps.google.com/cbk?output=json&ll=${lat},${lng}&dm=1`;
        const response = await fetch(url);
        return response.json();
    }

    public static async loadImage(panoID: string, zoom: number, x: number, y: number): Promise<ImageBitmap> {
        const url = `http://maps.google.com/cbk?output=tile&panoid=${panoID}&zoom=${zoom}&x=${x}&y=${y}`;
        const response = await fetch(url);
        const blob = await response.blob();
        return createImageBitmap(blob);
    }

}
