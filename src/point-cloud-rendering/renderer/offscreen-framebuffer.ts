export class OffscreenFramebuffer {

    private readonly fb: WebGLFramebuffer;

    private width = 1;
    private height = 1;

    private readonly fbColorTarget: WebGLTexture;
    private readonly fbNormalTarget: WebGLTexture;
    private readonly fbDepthTarget: WebGLTexture;

    constructor(private gl: WebGL2RenderingContext) {

        // frame buffer textures
        this.fbColorTarget = gl.createTexture() as WebGLTexture;
        this.fbNormalTarget = gl.createTexture() as WebGLTexture;
        this.fbDepthTarget = gl.createTexture() as WebGLTexture;
        this.resize(this.width, this.height);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.fbColorTarget);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.fbNormalTarget);

        // framebuffer
        this.fb = gl.createFramebuffer() as WebGLFramebuffer;
        this.bind();
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fbColorTarget, 0);
        // disable normal output for better performance
        // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.fbNormalTarget, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.fbDepthTarget, 0);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
        this.unbind();
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.setTexture(this.fbColorTarget, this.gl.RGBA32F);
        this.setTexture(this.fbNormalTarget, this.gl.RGBA32F);
        this.setTexture(this.fbDepthTarget, this.gl.DEPTH_COMPONENT32F);
    }

    bind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb);
        this.gl.viewport(0, 0, this.width, this.height);
    }

    unbind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    private setTexture(t: WebGLTexture, internalFormat: number) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, t);

        if (internalFormat === this.gl.DEPTH_COMPONENT32F) {
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, this.width,  this.height, 0, this.gl.DEPTH_COMPONENT, this.gl.FLOAT, null);
        } else {
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, this.width,  this.height, 0, this.gl.RGBA, this.gl.FLOAT, null);
        }

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    }


}
