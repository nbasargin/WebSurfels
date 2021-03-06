import { WebGLUtils } from '../web-gl-utils';

export const quadVS = `
    #version 300 es

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
    uniform float uSizeScale;

    // lighting
    uniform bool uEnableLighting;
    uniform vec3 uLightDir;
    uniform float uLightAmbientIntensity;
    uniform float uLightSpecularIntensity;
    uniform float uLightSpecularShininess;

    // splatting depth
    uniform float uSplatDepthSizeRatio; // multiplied with point size to determine base splatting depth
    uniform float uSplatDepthEpsilon;   // added to base splatting depth during depth pass to reduce numerical issues

    out highp vec2 uv;
    flat out vec3 v_color;

    void main() {
        vec3 point_normal = normal;
        vec3 quad_normal = vec3(0.0, 0.0, 1.0);

		vec3 rot_axis = cross(quad_normal, point_normal);
		if (length(rot_axis) == 0.0) {
		    rot_axis = vec3(1.0, 0.0, 0.0);
		} else {
		    rot_axis = normalize(rot_axis);
		}
		float rot_angle = acos(dot(quad_normal, point_normal));
		float world_point_size = size * uSizeScale;
		
		mat3 rot_mat = rotation_matrix(rot_axis, rot_angle);
		
		vec3 vertex_pos = pos + rot_mat * quadVertex * world_point_size;	
		if (uDepthPass) {
		    // move splats back from the camera to define the splatting interval
		    vec3 view_direction = normalize(vertex_pos - uEyePos);
		    vertex_pos += view_direction * world_point_size * uSplatDepthSizeRatio;
		}		
			
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(vertex_pos, 1.0);
        uv = quadVertex.xy * 2.0;

        if (!uDepthPass) {
            // Gouraud shading
            if (uEnableLighting) {
                // uLightAmbientIntensity is the minimal received light
                // The remaining contribution is scaled by (1.0 - uLightAmbientIntensity) and depends on surface normal and light direction
                vec3 light_dir = normalize(uLightDir);
                // ambient and diffuse: scale point color
                float diffuse = uLightAmbientIntensity + (1.0 - uLightAmbientIntensity) * max(0.0, dot(light_dir, normal));
                // specular: add light color (white)
                vec3 view_direction_to_center = normalize(pos - uEyePos);
                vec3 reflect_direction = reflect(light_dir, normal);
                float specular = uLightSpecularIntensity * pow(max(dot(view_direction_to_center, reflect_direction), 0.0), uLightSpecularShininess);
                v_color = color * diffuse + vec3(1.0, 1.0, 1.0) * specular;
            } else {
                v_color = color;
            }
        }
    }
`.trim();

export const quadFS = `
    #version 300 es
    
    precision highp float;
    
    in highp vec2 uv;    
    flat in vec3 v_color;
    
    uniform bool uDepthPass;
    
    layout(location=0) out highp vec4 color;
    
    void main() {
    
        float len = length(uv);
        if (len > 1.0) {
            discard;
        }
        
        if (!uDepthPass) {        
            float hardness = 4.0;
            float weight = pow(1.0 - len * len, hardness);
            color = vec4(v_color * weight, weight);
        
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
        sizeScale: WebGLUniformLocation,

        enableLighting: WebGLUniformLocation,
        lightDirection: WebGLUniformLocation,
        lightAmbientIntensity: WebGLUniformLocation,
        lightSpecularIntensity: WebGLUniformLocation,
        lightSpecularShininess: WebGLUniformLocation,

        splatDepthSizeRatio: WebGLUniformLocation,
        splatDepthEpsilon: WebGLUniformLocation,
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
            sizeScale: gl.getUniformLocation(this.program, 'uSizeScale') as WebGLUniformLocation,

            enableLighting: gl.getUniformLocation(this.program, 'uEnableLighting') as WebGLUniformLocation,
            lightDirection: gl.getUniformLocation(this.program, 'uLightDir') as WebGLUniformLocation,
            lightAmbientIntensity: gl.getUniformLocation(this.program, 'uLightAmbientIntensity') as WebGLUniformLocation,
            lightSpecularIntensity: gl.getUniformLocation(this.program, 'uLightSpecularIntensity') as WebGLUniformLocation,
            lightSpecularShininess: gl.getUniformLocation(this.program, 'uLightSpecularShininess') as WebGLUniformLocation,

            splatDepthSizeRatio: gl.getUniformLocation(this.program, 'uSplatDepthSizeRatio') as WebGLUniformLocation,
            splatDepthEpsilon: gl.getUniformLocation(this.program, 'uSplatDepthEpsilon') as WebGLUniformLocation,
        };
    }

}
