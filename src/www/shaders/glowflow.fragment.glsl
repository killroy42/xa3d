#define M_PI2 2.0*3.1415926535897932384626433832795

#define a_0 0.017
#define a_1 0.25
#define a_2 0.257
#define a_3 0.007
#define a_4 3.0
#define a_5 0.8

#define b_0 -0.05
#define b_1 0.13
#define b_2 0.1
#define b_3 0.05
#define b_4 1.0
#define b_5 0.76

#define c_0 0.049
#define c_1 0.75
#define c_2 0.069
#define c_3 0.06
#define c_4 7.0
#define c_5 0.73

#define d_0 -0.019
#define d_1 0.87
#define d_2 0.37
#define d_3 0.0077
#define d_4 13.0
#define d_5 0.27

#define e_0 0.0123
#define e_1 0.87
#define e_2 0.37
#define e_3 0.0027
#define e_4 27.0
#define e_5 0.19

uniform float time;
uniform float frequency;
uniform vec3 glowColor;
varying vec2 vUv;

void main() {
	float t = time * frequency;
	float a = sin((t * a_0 + a_1 + sin(t * a_2 * M_PI2) * a_3 + vUv.x) * M_PI2 * a_4) * a_5;
	float b = sin((t * b_0 + b_1 + sin(t * b_2 * M_PI2) * b_3 + vUv.x) * M_PI2 * b_4) * b_5;
	float c = sin((t * c_0 + c_1 + sin(t * c_2 * M_PI2) * c_3 + vUv.x) * M_PI2 * c_4) * c_5;
	float d = sin((t * d_0 + d_1 + sin(t * d_2 * M_PI2) * d_3 + vUv.x) * M_PI2 * d_4) * d_5;
	float e = sin((t * e_0 + e_1 + sin(t * e_2 * M_PI2) * e_3 + vUv.x) * M_PI2 * e_4) * e_5;
	float amp = a_5 + b_5 + c_5 + d_5 + e_5;
	float fFactor = 0.5 + ((a + b + c + d + e) / amp) * 0.5;
	float vStrength = vUv.y / pow(fFactor, 0.4);
	//gl_FragColor = vec4(mix(glowColor, vec3(1.0), vStrength), 1.0 - vStrength);
	gl_FragColor = vec4(mix(glowColor, vec3(0.0), vStrength), 1.0);
}