export interface StreetViewData {
    Data: {
        image_width: string,
        image_height: string,
        [k: string]: string,
    };
    Links: Array<{
        panoId: string,
        description?: string,
    }>;
    Location: {
        panoId: string,
        zoomLevels: string,
        lat: string,
        lng: string,
        original_lat: string,
        original_lng: string,
    };
    Projection: any;
    model: {
        depth_map: string
    }
}


export class PanoramaLoader {

    public static async loadById(panoID: string): Promise<StreetViewData> {
        const url = `http://maps.google.com/cbk?output=json&panoid=${panoID}&dm=1`;
        const response = await fetch(url);
        return response.json();
    }

    public static async loadByLocation(lat: number, lng: number): Promise<StreetViewData> {
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
