import { Program } from './program';
import { mat4 } from 'gl-matrix';
import { PointCloudData } from "../../data/point-cloud-data";
import { RendererConstants } from "../renderer-constants";


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
    in vec3 color;
    in vec3 normal; 
    in vec3 quadVertex;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uModelViewMatrixIT;
    uniform mat4 uProjectionMatrix;
    
    out highp vec2 uv;
    flat out vec3 v_color;
    flat out vec3 v_normal;
    
    void main() {
        vec3 point_normal = normal;
        vec3 quad_normal = vec3(0.0, 0.0, 1.0);
        
		vec3 rot_axis = cross(quad_normal, point_normal);
		float rot_angle = acos(dot(quad_normal, point_normal));
		float world_point_size = ${RendererConstants.POINT_SIZE};
		
		mat3 rot_mat = rotation_matrix(rot_axis, rot_angle);
    
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos + rot_mat * quadVertex * world_point_size, 1.0);
        
        uv = quadVertex.xy * 2.0;
        v_color = color;
    }
`.trim();

const quadFS = `
    #version 300 es
    
    in highp vec2 uv;
    
    out highp vec4 color;
    
    precision highp float;
    
    flat in vec3 v_color;
    flat in vec3 v_normal;
    
    void main() {
    
        highp float len = length(uv);
        if (len > 1.0) {
            discard;
        }
    
        // color = vec4(1.0, 1.0, 1.0, 1.0);
        color = vec4(v_color, 1.0);
    }
`.trim();

export class QuadProgram extends Program {

    private readonly attributes: {
        pos: GLint,
        color: GLint,
        normal: GLint,
        quadVertex: GLint,
    };

    private readonly uniforms: {
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
        modelViewMatrixIT: WebGLUniformLocation,
    };

    private readonly buffers: {
        pos: WebGLBuffer,
        color: WebGLBuffer,
        normal: WebGLBuffer,
        quadVertex: WebGLBuffer,
    };

    private quadVertices = [
        -0.5, -0.5, 0,
        -0.5, 0.5, 0,
        0.5, -0.5, 0,
        0.5, 0.5, 0,
    ];

    private numPoints: number = 0;

    constructor(
        gl: WebGL2RenderingContext,
        private canvas: HTMLCanvasElement,
        private projectionMatrix: mat4,
        private modelViewMatrix: mat4,
        private modelViewMatrixIT: mat4,
    ) {
        super(gl, quadVS, quadFS);

        this.attributes = {
            pos: gl.getAttribLocation(this.program, 'pos'),
            color: gl.getAttribLocation(this.program, 'color'),
            normal: gl.getAttribLocation(this.program, 'normal'),
            quadVertex: gl.getAttribLocation(this.program, 'quadVertex'),
        };

        console.log(this.attributes);

        this.uniforms = {
            projectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: gl.getUniformLocation(this.program, 'uModelViewMatrix') as WebGLUniformLocation,
            modelViewMatrixIT: gl.getUniformLocation(this.program, 'uModelViewMatrixIT') as WebGLUniformLocation,
        };

        this.buffers = {
            pos: gl.createBuffer() as WebGLBuffer,
            color: gl.createBuffer() as WebGLBuffer,
            normal: gl.createBuffer() as WebGLBuffer,
            quadVertex: gl.createBuffer() as WebGLBuffer,
        };

        // this.setBufferData(this.buffers.pos, new Float32Array(this.points));
        this.setBufferData(this.buffers.quadVertex, new Float32Array(this.quadVertices));
    }

    render() {

        this.gl.enable(this.gl.DEPTH_TEST);

        this.gl.useProgram(this.program);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, this.modelViewMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrixIT, false, this.modelViewMatrixIT);

        this.enableBuffer3f(this.buffers.quadVertex, this.attributes.quadVertex);
        this.enableBuffer3f(this.buffers.pos, this.attributes.pos);
        this.gl.vertexAttribDivisor(this.attributes.pos, 1);

        this.enableBuffer3f(this.buffers.color, this.attributes.color);
        this.gl.vertexAttribDivisor(this.attributes.color, 1);

        this.enableBuffer3f(this.buffers.normal, this.attributes.normal);
        this.gl.vertexAttribDivisor(this.attributes.normal, 1);

        this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, this.quadVertices.length / 3, this.numPoints);
    }

    setData(data: PointCloudData) {
        this.numPoints = data.positions.length / 3;
        this.setBufferData(this.buffers.pos, data.positions);
        this.setBufferData(this.buffers.color, data.colors);
        this.setBufferData(this.buffers.normal, data.normals);
    }

}