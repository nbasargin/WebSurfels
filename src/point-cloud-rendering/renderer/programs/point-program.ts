import { mat4 } from 'gl-matrix';
import { PointCloudData } from '../../data/point-cloud-data';
import { Program } from './program';

const pointVS = `
    #version 300 es
    
    // precision highp float;

    in vec3 pos;
    in vec3 color;
    in vec3 normal; 

    uniform mat4 uModelViewMatrix;
    uniform mat4 uModelViewMatrixIT;
    uniform mat4 uProjectionMatrix;
    uniform float uScreenHeight;
    
    uniform bool uDepthPass;
    // uniform highp vec3 uEyePos;

    flat out vec3 v_color;
    flat out vec3 v_normal; 
    flat out float rotation;
    flat out float squeeze;

    void main() {
        vec4 vertex_world_space = uModelViewMatrix * vec4(pos, 1.0);
        vec3 normal_world_space = normalize((uModelViewMatrixIT * vec4(normal, 0.0)).xyz);
        
        float world_point_size = 0.5 * 0.15;  // 0.5 equals a square with world size of 1x1
        
    
        // point position
        vec4 vertex_world_space_copy = vertex_world_space;
        
        if (uDepthPass) {    
            vertex_world_space_copy.xyz += normalize(vertex_world_space_copy.xyz) * 0.1;
        }
    
        gl_Position = uProjectionMatrix * vertex_world_space_copy;
        vec4 true_position = uProjectionMatrix * vertex_world_space;
        
        
        
        // point size and shape
        
        
        v_color = color;
        v_normal = normal;
        bool has_normal = length(normal) > 0.0;
        
        vec3 n_vertex_world_space = normalize(vertex_world_space.xyz);
        vec3 axis = cross(n_vertex_world_space, normal_world_space);                
        rotation = has_normal ? atan(axis.y / axis.x) : 0.0;        
        squeeze = has_normal ? dot(n_vertex_world_space, normal_world_space) : 1.0;


        // small points cause problems, so limit size to 5
        gl_PointSize = max(5.0, world_point_size * uScreenHeight * uProjectionMatrix[1][1] / true_position.w);
    }
`.trim();

const pointFS = `
    #version 300 es
    
    #define PI radians(180.0)
    #define MIN_LIGHTNESS 0.5

    precision highp float;

    flat in vec3 v_color;
    flat in vec3 v_normal;
    flat in float rotation;
    flat in float squeeze;
        
    layout(location=0) out highp vec4 color;
    layout(location=1) out highp vec3 normal_out;

    void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0; 
        
        float sin_r = sin(rotation);
        float cos_r = cos(rotation);
        // limit squeezing to 80% -> at least one pixel should be visible given min point size of 5
        float cos_s = max(0.2, abs(squeeze)); 
        
        float x_trans = cos_s * (cos_r * cxy.x - sin_r * cxy.y);
        float y_trans = (sin_r * cxy.x + cos_r * cxy.y);
        
        if (x_trans * x_trans + y_trans * y_trans > cos_s * cos_s) {        
            discard;
        }
        
        // test: modify color based on light
        // MIN_LIGHTNESS is the minimal received light (ambient)
        // The remaining contribution is scaled by (1.0 - MIN_LIGHTNESS) and depends on surface normal and light direction
        
        bool has_normal = length(v_normal) > 0.0;
        vec3 light_dir = vec3(1.0, 0.0, 0.0);
        float light = has_normal ? MIN_LIGHTNESS + (1.0 - MIN_LIGHTNESS) * max(0.0, dot(light_dir, v_normal)) : 1.0;
        // gl_FragColor = vec4(v_color * light, 1.0); // vec4(light, light, light, 1.0);
        color = vec4(v_color * light, 1.0);
        normal_out = v_normal;
    }
`.trim();

export class PointProgram extends Program {

    private readonly attributes: {
        pos: GLint,
        color: GLint,
        normal: GLint,
    };

    private readonly uniforms: {
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
        modelViewMatrixIT: WebGLUniformLocation,
        screenHeight: WebGLUniformLocation,
        depthPass: WebGLUniformLocation,
       // eyePos: WebGLUniformLocation,
    };

    private readonly buffers: {
        pos: WebGLBuffer,
        color: WebGLBuffer,
        normal: WebGLBuffer,
    };

    private numPoints: number = 0;

    private readonly framebuffer: WebGLFramebuffer;
    private readonly fbColorTarget: WebGLTexture;
    private readonly fbNormalTarget: WebGLTexture;
    private readonly fbDepthTarget: WebGLTexture;
    private fbWidth = 1;
    private fbHeight = 1;

    constructor(
        gl: WebGL2RenderingContext,
        private canvas: HTMLCanvasElement,
        private projectionMatrix: mat4,
        private modelViewMatrix: mat4,
        private modelViewMatrixIT: mat4,
    ) {
        super(gl, pointVS, pointFS);

        this.attributes = {
            pos: gl.getAttribLocation(this.program, 'pos'),
            color: gl.getAttribLocation(this.program, 'color'),
            normal: gl.getAttribLocation(this.program, 'normal'),
        };

        this.uniforms = {
            projectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: gl.getUniformLocation(this.program, 'uModelViewMatrix') as WebGLUniformLocation,
            modelViewMatrixIT: gl.getUniformLocation(this.program, 'uModelViewMatrixIT') as WebGLUniformLocation,
            screenHeight: gl.getUniformLocation(this.program, 'uScreenHeight') as WebGLUniformLocation,
            depthPass: gl.getUniformLocation(this.program, 'uDepthPass') as WebGLUniformLocation,
           // eyePos: gl.getUniformLocation(this.program, 'uEyePos') as WebGLUniformLocation,
        };

        this.buffers = {
            pos: gl.createBuffer() as WebGLBuffer,
            color: gl.createBuffer() as WebGLBuffer,
            normal: gl.createBuffer() as WebGLBuffer,
        };

        // frame buffer textures
        this.fbColorTarget = gl.createTexture() as WebGLTexture;
        this.fbNormalTarget = gl.createTexture() as WebGLTexture;
        this.fbDepthTarget = gl.createTexture() as WebGLTexture;
        this.setTexture(this.fbColorTarget, gl.RGBA32F);
        this.setTexture(this.fbNormalTarget, gl.RGBA32F);
        this.setTexture(this.fbDepthTarget, gl.DEPTH_COMPONENT32F);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.fbColorTarget);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.fbNormalTarget);

        // framebuffer
        this.framebuffer = gl.createFramebuffer() as WebGLFramebuffer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fbColorTarget, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.fbNormalTarget, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.fbDepthTarget, 0);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // ext check
        const extensions = ["EXT_color_buffer_float", "EXT_float_blend"];
        for (const ext of extensions) {
            if (!gl.getExtension(ext)) {
                console.error(`Required WebGL extensions missing: ${ext}`);
            }
        }
    }

    render() {
        const gl = this.gl;

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);

        gl.clearDepth(1.0);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);

        this.gl.useProgram(this.program);
        // noinspection JSSuspiciousNameCombination
        this.gl.uniform1f(this.uniforms.screenHeight, this.gl.drawingBufferHeight);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, this.modelViewMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrixIT, false, this.modelViewMatrixIT);
        this.enableBuffer3f(this.buffers.pos, this.attributes.pos);
        this.enableBuffer3f(this.buffers.color, this.attributes.color);
        this.enableBuffer3f(this.buffers.normal, this.attributes.normal);

        // depth pass
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        // this.gl.viewport(0, 0, this.fbWidth, this.fbHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        //this.gl.depthMask(true);
        this.gl.colorMask(false, false, false, false);
        this.gl.uniform1i(this.uniforms.depthPass, 1);
        this.gl.drawArrays(this.gl.POINTS, 0, this.numPoints);

        // splat pass
        //this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        //this.gl.viewport(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
        this.gl.depthMask(false);
        this.gl.colorMask(true, true, true, true);
        this.gl.uniform1i(this.uniforms.depthPass, 0);
        this.gl.drawArrays(this.gl.POINTS, 0, this.numPoints);
    }

    setData(data: PointCloudData) {
        this.numPoints = data.positions.length / 3;
        this.setBufferData(this.buffers.pos, data.positions);
        this.setBufferData(this.buffers.color, data.colors);
        this.setBufferData(this.buffers.normal, data.normals);
    }

    resizeFramebuffer(width: number, height: number) {
        this.fbWidth = width;
        this.fbHeight = height;

        this.setTexture(this.fbColorTarget, this.gl.RGBA32F);
        this.setTexture(this.fbNormalTarget, this.gl.RGBA32F);
        this.setTexture(this.fbDepthTarget, this.gl.DEPTH_COMPONENT32F);
    }

    private setTexture(t: WebGLTexture, internalFormat: number) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, t);
        // this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, internalFormat, this.fbWidth, this.fbHeight);

        if (internalFormat === this.gl.DEPTH_COMPONENT32F) {
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, this.fbWidth,  this.fbHeight, 0, this.gl.DEPTH_COMPONENT, this.gl.FLOAT, null);
        } else {
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, this.fbWidth,  this.fbHeight, 0, this.gl.RGBA, this.gl.FLOAT, null);
        }

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    }

}
