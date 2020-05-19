export interface StreetViewApiResponse {
    Data: {
        image_width: string,
        image_height: string,
        [k: string]: string,
    };
    Links: Array<{
        yawDeg: string,
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
    Projection: {
        projection_type: 'spherical' | string,
        pano_yaw_deg: string,
        tilt_yaw_deg: string,
        tilt_pitch_deg: string,
    };
    model?: {
        depth_map: string
    }
}
