import { StreetViewApiResponse } from './street-view-api-response';

export interface StreetViewApi {

    loadDataById(panoID: string): Promise<StreetViewApiResponse>;

    loadDataByLocation(lat: number, lng: number): Promise<StreetViewApiResponse>;

    loadImage(panoID: string, zoom: number, x: number, y: number): Promise<ImageBitmap>;

}
