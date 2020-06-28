export class RendererOptions {

    private _backfaceCulling: boolean;

    highQuality: boolean = true;
    sizeScale: number = 1;
    splatDepthSizeRatio: number = 0.5;
    splatDepthEpsilon: number = 0.0001;

    get backfaceCulling(): boolean {
        return this._backfaceCulling;
    }

    set backfaceCulling(enabled: boolean) {
        this._backfaceCulling = enabled;
        if (enabled) {
            this.gl.enable(this.gl.CULL_FACE);
            this.gl.cullFace(this.gl.BACK);
        } else {
            this.gl.disable(this.gl.CULL_FACE);
        }
    }

    constructor(private gl: WebGL2RenderingContext) {
        this.backfaceCulling = true;
    }

}
