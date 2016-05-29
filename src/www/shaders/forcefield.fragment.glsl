uniform float c;
uniform float p;
uniform vec3 glowColor;
uniform sampler2D noiseMap;
varying vec2 vUv;
//varying float intensity;
//varying mat3 vNormalMatrix;
varying vec3 vNormal;
varying vec3 vNormel;
void main() {

	float height = 0.01;
	vec2 resolution = vec2(128.0, 128.0);
	float val = texture2D(noiseMap, vUv).x;
	float valU = texture2D(noiseMap, vUv + vec2(1.0 / resolution.x, 0.0)).x;
	float valV = texture2D(noiseMap, vUv + vec2(0.0, 1.0 / resolution.y)).x;
	vec3 texNormal = vec3((0.5 * normalize(vec3(val - valU, val - valV, height)) + 0.5));
	//gl_FragColor = normalColor;

	//vec3 vNormal = normalize(normalMatrix * normal);
	//vec3 vNormal2 = normalize(vNormalMatrix * vNormal);
	//vNormel = normalize(normalMatrix * viewVector);
	float intensity = pow(abs(c - abs(dot((vNormal * texNormal), vNormel))), p);

	//vec4 noiseColor = texture2D(noiseMap, vUv);
	vec3 glow = glowColor * intensity;
	//glow = (glow + glowColor * noiseColor.rgb) * 0.5;
	//glow = (glow + glowColor) * 0.5;
	gl_FragColor = vec4(glow, length(glow));
	//gl_FragColor = vec4(texNormal, 1.0);
}