import { Program } from './program';
import { mat4 } from 'gl-matrix';


const quadVS = `
    #version 300 es
    
    // adapted from http://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/
    // expecting normalized axis (length of 1)
    mat3 rotation_matrix(vec3 axis, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        float oc = 1.0 - c;
    
        return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
    }
    
    in vec3 pos;
    in vec3 splatVertices;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    out highp vec2 uv; 
    
    void main() {
        vec3 point_normal = normalize(vec3(1.0, 1.0, 1.0));
        vec3 quad_normal = vec3(0.0, 0.0, 1.0);
        
		vec3 rot_axis = cross(quad_normal, point_normal);
		float rot_angle = acos(dot(quad_normal, point_normal));
		
		mat3 rot_mat = rotation_matrix(rot_axis, rot_angle);
    
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos + rot_mat * splatVertices, 1.0);
        
        uv = splatVertices.xy * 2.0;
    }
`.trim();

const quadFS = `
    #version 300 es
    
    in highp vec2 uv;
    
    out highp vec4 color;
    
    void main() {
    
        highp float len = length(uv);
        if (len > 1.0) {
            discard;
        }
    
        color = vec4(1.0, 1.0, 1.0, 1.0);
    }
`.trim();

export class QuadProgram extends Program {

    private readonly attributes: {
        pos: GLint,
        splatVertices: GLint,
    };

    private readonly uniforms: {
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
    };

    private readonly buffers: {
        pos: WebGLBuffer,
        splatVertices: WebGLBuffer,
    };

    private splatVertices = [
        -0.5, -0.5, 0,
        -0.5, 0.5, 0,
        0.5, -0.5, 0,
        0.5, 0.5, 0,
    ];

    private points = [
        0, 0, 0,
        0, 0, -1,
        0, 0, -2,
        0, 0, -3,
    ];

    constructor(
        gl: WebGL2RenderingContext,
        private canvas: HTMLCanvasElement,
        private projectionMatrix: mat4,
        private modelViewMatrix: mat4,
    ) {
        super(gl, quadVS, quadFS);

        this.attributes = {
            pos: gl.getAttribLocation(this.program, 'pos'),
            splatVertices: gl.getAttribLocation(this.program, 'splatVertices'),
        };

        console.log(this.attributes);

        this.uniforms = {
            projectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: gl.getUniformLocation(this.program, 'uModelViewMatrix') as WebGLUniformLocation,
        };

        this.buffers = {
            pos: gl.createBuffer() as WebGLBuffer,
            splatVertices: gl.createBuffer() as WebGLBuffer,
        };

        this.setBufferData(this.buffers.pos, new Float32Array(this.points));
        this.setBufferData(this.buffers.splatVertices, new Float32Array(this.splatVertices));
    }

    render() {
        this.gl.useProgram(this.program);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, this.modelViewMatrix);

        this.enableBuffer3f(this.buffers.pos, this.attributes.pos);
        this.enableBuffer3f(this.buffers.splatVertices, this.attributes.splatVertices); //
        this.gl.vertexAttribDivisor(this.attributes.pos, 1);

        const numPoints = 4;
        this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, this.splatVertices.length / 3, numPoints);
    }

}