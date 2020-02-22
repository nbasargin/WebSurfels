export class RendererNode {

    visible = true;
    numPoints: number;

    // when adding buffers, make sure that renderer deletes them during cleanup
    buffers: {
        positions: WebGLBuffer;
        sizes: WebGLBuffer,
        colors: WebGLBuffer;
        normals: WebGLBuffer;
    };


}
