import { WebGLUtils } from './web-gl-utils';

const SHAPE_PRESERVING_DEPTH_PASS: 0 | 1 = 1;
const SPLAT_DEPTH: 'auto' | number = 'auto';

export const quadVS = `
    #version 300 es
    
    // only modify z but not x & y during depth pass: more expensive but prevents mismatching shapes
    #define SHAPE_PRESERVING_DEPTH_PASS ${SHAPE_PRESERVING_DEPTH_PASS}
    #define USE_LIGHTING 1
    #define MIN_LIGHTNESS 0.3
    
    // adapted from http://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/
    // expecting normalized axis (length of 1)
    mat3 rotation_matrix(vec3 axis, float angle) {
        float s = -sin(angle);
        float c = cos(angle);
        float oc = 1.0 - c;
    
        return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
    }
    
    in vec3 pos;
    in float size;
    in vec3 color;
    in vec3 normal; 
    in vec3 quadVertex;

    uniform vec3 uEyePos; 
    uniform mat4 uModelViewMatrix;
    uniform mat4 uModelViewMatrixIT;
    uniform mat4 uProjectionMatrix;
    uniform bool uDepthPass;
    
    out highp vec2 uv;
    flat out vec3 v_color;
    // flat out vec3 v_normal;
    
    void main() {
        vec3 point_normal = normal;
        vec3 quad_normal = vec3(0.0, 0.0, 1.0);
        
		vec3 rot_axis = normalize(cross(quad_normal, point_normal));
		float rot_angle = acos(dot(quad_normal, point_normal));
		float world_point_size = size;
		
		mat3 rot_mat = rotation_matrix(rot_axis, rot_angle);
		
		vec3 vertex_pos = pos + rot_mat * quadVertex * world_point_size;
		
		
        #if defined(SHAPE_PRESERVING_DEPTH_PASS) && SHAPE_PRESERVING_DEPTH_PASS == 0
            // for non shape-preserving depth pass, move points away from the camera to create a depth margin 
            if (uDepthPass) {
                vec3 view_direction = normalize(vertex_pos - uEyePos);
                vertex_pos += view_direction * ${SPLAT_DEPTH === 'auto' ? 'world_point_size * 0.5' : SPLAT_DEPTH};		
            }
        #endif
		  
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(vertex_pos, 1.0); 
        
        #if defined(SHAPE_PRESERVING_DEPTH_PASS) && SHAPE_PRESERVING_DEPTH_PASS == 1
            // for shape-preserving depth pass, modify z as if point would be more far away 
            if (uDepthPass) {
                vec3 view_direction = normalize(vertex_pos - uEyePos);
                vertex_pos += view_direction * ${SPLAT_DEPTH === 'auto' ? 'world_point_size * 0.5' : SPLAT_DEPTH};	
                vec4 new = uProjectionMatrix * uModelViewMatrix * vec4(vertex_pos, 1.0); 	
                gl_Position.z = new.z / new.w * gl_Position.w;
            }
        #endif
		
        uv = quadVertex.xy * 2.0;
        
        // Gouraud shading
        
        if (!uDepthPass) {        
            #if defined(USE_LIGHTING) && USE_LIGHTING == 1
                // MIN_LIGHTNESS is the minimal received light (ambient)
                // The remaining contribution is scaled by (1.0 - MIN_LIGHTNESS) and depends on surface normal and light direction
                vec3 light_dir = normalize(vec3(1.0, 3.0, 1.0));
                // ambient and diffuse: scale point color
                float diffuse = MIN_LIGHTNESS + (1.0 - MIN_LIGHTNESS) * max(0.0, dot(light_dir, normal));
                // specular: add light color (white)
                vec3 view_direction_to_center = normalize(pos - uEyePos);
                vec3 reflect_direction = reflect(light_dir, normal);
                float specular = 0.2 * pow(max(dot(view_direction_to_center, reflect_direction), 0.0), 32.0);            
                v_color = color * diffuse + vec3(1.0, 1.0, 1.0) * specular;
            #else
                v_color = color;
            #endif
            
            // v_normal = normal;
        } else {
            // v_color = vec3(1.0, 1.0, 1.0);
        }
    }
`.trim();

export const quadFS = `
    #version 300 es
    
    precision highp float;
    
    in highp vec2 uv;    
    flat in vec3 v_color;
    // flat in vec3 v_normal;
    
    uniform bool uDepthPass;
    
    layout(location=0) out highp vec4 color;
    // layout(location=1) out highp vec3 normal_out;
    
    void main() {
    
        highp float len = length(uv);
        if (len > 1.0) {
            discard;
        }
        
        if (!uDepthPass) {        
            float hardness = 4.0;
            float weight = pow(1.0 - len * len, hardness); 
            
            color = vec4(v_color * weight, weight);
            // normal_out = v_normal * weight;
        } else {        
            color = vec4(1.0, 1.0, 1.0, 1.0);
        }
    
    }
`.trim();


export class SplatShader {

    program: WebGLProgram;

    quadVertexBuffer: WebGLBuffer;

    readonly attributeLocations: {
        pos: GLint,
        size: GLint,
        color: GLint,
        normal: GLint,
        quadVertex: GLint,
    };

    readonly uniformLocations: {
        eyePos: WebGLUniformLocation,
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
        modelViewMatrixIT: WebGLUniformLocation,
        depthPass: WebGLUniformLocation,
    };

    constructor(private gl: WebGL2RenderingContext) {
        const quadData = [
            0.5, -0.5, 0,
            0.5, 0.5, 0,
            -0.5, -0.5, 0,
            -0.5, 0.5, 0,
        ];
        this.quadVertexBuffer = WebGLUtils.createBuffer(gl, new Float32Array(quadData));

        this.program = WebGLUtils.createProgram(gl, quadVS, quadFS);

        this.attributeLocations = {
            pos: gl.getAttribLocation(this.program, 'pos'),
            size: gl.getAttribLocation(this.program, 'size'),
            color: gl.getAttribLocation(this.program, 'color'),
            normal: gl.getAttribLocation(this.program, 'normal'),
            quadVertex: gl.getAttribLocation(this.program, 'quadVertex'),
        };

        this.uniformLocations = {
            eyePos: gl.getUniformLocation(this.program, 'uEyePos') as WebGLUniformLocation,
            projectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: gl.getUniformLocation(this.program, 'uModelViewMatrix') as WebGLUniformLocation,
            modelViewMatrixIT: gl.getUniformLocation(this.program, 'uModelViewMatrixIT') as WebGLUniformLocation,
            depthPass: gl.getUniformLocation(this.program, 'uDepthPass') as WebGLUniformLocation,
        };
    }

}