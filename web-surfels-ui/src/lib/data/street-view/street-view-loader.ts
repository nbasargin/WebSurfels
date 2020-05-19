import { StreetViewApiResponse } from './street-view-api-response';
import { StreetViewConverter, StreetViewConverterOptions } from './street-view-converter';
import { StreetViewPanorama } from './street-view-panorama';


export class StreetViewLoader {

    private streetViewConverter: StreetViewConverter;

    constructor(options: StreetViewConverterOptions | object = {}) {
        this.streetViewConverter = new StreetViewConverter(options);
    }

    async loadPanorama(id: string): Promise<StreetViewPanorama> {
        // load panorama data & bitmap from google
        const [pano, bitmap] = await Promise.all([
            StreetViewLoader.loadDataById(id),
            StreetViewLoader.loadImage(id, 0, 0, 0),
        ]);
        return this.streetViewConverter.processPanorama(pano, bitmap);
    }


    // ID like 'GTKQkr3G-rRZQisDUMzUtg'
    public static async loadDataById(panoID: string): Promise<StreetViewApiResponse> {
        const url = `https://maps.google.com/cbk?output=json&panoid=${panoID}&dm=1`;
        const response = await fetch(url);
        return response.json();
    }

    // Location like 40.762475, -73.974363
    private static async loadDataByLocation(lat: number, lng: number): Promise<StreetViewApiResponse> {
        const url = `https://maps.google.com/cbk?output=json&ll=${lat},${lng}&dm=1`;
        const response = await fetch(url);
        return response.json();
    }

    private static async loadImage(panoID: string, zoom: number, x: number, y: number): Promise<ImageBitmap> {
        const url = `https://maps.google.com/cbk?output=tile&panoid=${panoID}&zoom=${zoom}&x=${x}&y=${y}`;
        const response = await fetch(url);
        const blob = await response.blob();
        return createImageBitmap(blob);
    }

}
