import { mat4 } from 'gl-matrix';
import { PointCloudData } from '../../data/point-cloud-data';
import { Program } from './program';
import { OffscreenFramebuffer } from "../offscreen-framebuffer";
import { RendererConstants } from "../renderer-constants";

const USE_ELLIPSES = 1;

const pointVS = `
    #version 300 es
    
    // experimental approximation of projected circles
    // does not work well for objects close to the camera
    #define USE_ELLIPSES ${USE_ELLIPSES}
    
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
    // flat out vec3 v_normal; 
    
    #if defined(USE_ELLIPSES) && USE_ELLIPSES == 1
        flat out float rotation;
        flat out float squeeze;
    #endif

    void main() {
        vec4 position_camera_space = uModelViewMatrix * vec4(pos, 1.0);
        vec3 normal_camera_space = normalize((uModelViewMatrixIT * vec4(normal, 0.0)).xyz);
        float world_point_size = 0.5 * ${RendererConstants.POINT_SIZE};  // 0.5 equals a square with world size of 1x1
        
        v_color = color;
        // v_normal = normal;
        
        // point position        
        gl_Position = uProjectionMatrix * position_camera_space;
        
        
        #if defined(USE_ELLIPSES) && USE_ELLIPSES == 1
            // elliptical point shape
            bool has_normal = length(normal) > 0.0;        
            vec3 n_position_camera_space = normalize(position_camera_space.xyz);
            
            // possible viewing directions: 
            // - perspective view: n_position_camera_space  -> good for squeeze, rotation is aligned to projected normals
            // - orthographic view: vec3(0,0,-1)  -> rotation is aligned to orthographic normals (large changes if normal faces the camera)
            // - or mix of both, based on how steep the normal is aligned to the viewer
            //float mix_ratio = pow(abs(normal_camera_space.z), 4.0);
            //vec3 mixed_viewing_direction = n_position_camera_space * mix_ratio + vec3(0,0,-1) * (1.0 - mix_ratio);
                        
            vec3 axis = cross(n_position_camera_space, normal_camera_space);                
            rotation = has_normal ? atan(axis.y / axis.x) : 0.0;   
            float squeeze1 = abs(dot(n_position_camera_space, normal_camera_space));
            float squeeze2 = abs(dot(vec3(0,0,-1), normal_camera_space));
            squeeze = has_normal ? max(squeeze1, squeeze2) : 1.0;
            // optionally, squeezing could be limited to 80% to keep some color contribution for points at steep angles
            // it can also be used for backface culling by discarding fragments with negative squeeze values    
        #endif
        
        gl_PointSize = world_point_size * uScreenHeight * uProjectionMatrix[1][1] / gl_Position.w;
        // optionally, point size could be forced to be larger than 5 to prevent small points
        // however, this is actually the task of LOD
        
        // for depth pass, move points away from the camera to create a depth margin 
        if (uDepthPass) {
            position_camera_space.xyz += normalize(position_camera_space.xyz) * world_point_size * 2.5;
            gl_Position = uProjectionMatrix * position_camera_space;        
        }
    }
`.trim();

const pointFS = `
    #version 300 es
    
    #define USE_ELLIPSES ${USE_ELLIPSES}
    
    #define PI radians(180.0)
    #define MIN_LIGHTNESS 0.5

    precision highp float;

    flat in vec3 v_color;
    // flat in vec3 v_normal;
    
    #if defined(USE_ELLIPSES) && USE_ELLIPSES == 1
        flat in float rotation;
        flat in float squeeze;
    #endif
        
    layout(location=0) out highp vec4 color;
    // layout(location=1) out highp vec3 normal_out;

    void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0; 
        
        float dist = length(cxy);   
        float dist_limit = 1.0;
        
        #if defined(USE_ELLIPSES) && USE_ELLIPSES == 1
            float sin_r = sin(rotation);
            float cos_r = cos(rotation);
            float cos_s = squeeze;
            // optionally enable backface culling with max(0.0, -squeeze); 
            
            float x_trans = cos_s * (cos_r * cxy.x - sin_r * cxy.y);
            float y_trans = (sin_r * cxy.x + cos_r * cxy.y);
            
            dist = x_trans * x_trans + y_trans * y_trans;
            dist_limit = cos_s * cos_s;
        #endif 
             
        if (dist > dist_limit) {
            discard;
        }
        
        // cross lines
        //if (abs(x_trans) < 0.05 || abs(y_trans) < 0.05) {
        //    discard;
        //} 
        
        // test: modify color based on light
        // MIN_LIGHTNESS is the minimal received light (ambient)
        // The remaining contribution is scaled by (1.0 - MIN_LIGHTNESS) and depends on surface normal and light direction
        
        // bool has_normal = length(v_normal) > 0.0;
        // vec3 light_dir = vec3(1.0, 0.0, 0.0);
        // float light = has_normal ? MIN_LIGHTNESS + (1.0 - MIN_LIGHTNESS) * max(0.0, dot(light_dir, v_normal)) : 1.0;
        float light = 1.0;  // light disabled for now
        
        // weight = (1 − distance^2)^hardness
        float hardness = 4.0;
        dist = dist / dist_limit;
        float weight = pow(1.0 - dist * dist, hardness); 
        
        color = vec4(v_color * light * weight, weight);
        // normal_out = v_normal * weight;
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

    constructor(
        gl: WebGL2RenderingContext,
        private canvas: HTMLCanvasElement,
        private projectionMatrix: mat4,
        private modelViewMatrix: mat4,
        private modelViewMatrixIT: mat4,
        private offscreenFramebuffer: OffscreenFramebuffer,
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

        // ext check
        const extensions = ["EXT_color_buffer_float", "EXT_float_blend"];
        for (const ext of extensions) {
            if (!gl.getExtension(ext)) {
                console.error(`Required WebGL extensions missing: ${ext}`);
            }
        }

        // console.log('Point Program attributes:', this.attributes);
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
        this.gl.vertexAttribDivisor(this.attributes.pos, 0);  // temporary required to dynamically switch between programs
        this.enableBuffer3f(this.buffers.color, this.attributes.color);
        this.gl.vertexAttribDivisor(this.attributes.color, 0);  // temporary required to dynamically switch between programs
        this.enableBuffer3f(this.buffers.normal, this.attributes.normal);
        this.gl.vertexAttribDivisor(this.attributes.normal, 0);  // temporary required to dynamically switch between programs

        this.offscreenFramebuffer.bind();
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // depth pass
        this.gl.depthMask(true);
        this.gl.colorMask(false, false, false, false);
        this.gl.uniform1i(this.uniforms.depthPass, 1);
        this.gl.drawArrays(this.gl.POINTS, 0, this.numPoints);

        // splat pass
        this.gl.depthMask(false);
        this.gl.colorMask(true, true, true, true);
        this.gl.uniform1i(this.uniforms.depthPass, 0);
        this.gl.drawArrays(this.gl.POINTS, 0, this.numPoints);

        this.offscreenFramebuffer.unbind();
    }

    setData(data: PointCloudData) {
        this.numPoints = data.positions.length / 3;
        this.setBufferData(this.buffers.pos, data.positions);
        this.setBufferData(this.buffers.color, data.colors);
        this.setBufferData(this.buffers.normal, data.normals);
    }

}
