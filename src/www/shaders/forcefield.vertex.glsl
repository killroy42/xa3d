uniform float c;
uniform float p;
varying vec2 vUv;
//varying float intensity;
uniform sampler2D noiseMap;
//varying mat3 vNormalMatrix;
varying vec3 vNormal;
varying vec3 vNormel;
void main() {
	vec3 viewVector = cameraPosition - position;
	//vNormalMatrix = normalMatrix;
	//vNormal = normal;
	vNormal = normalize(normalMatrix * normal);
	vNormel = normalize(normalMatrix * viewVector);
	//intensity = pow(abs(c - abs(dot(vNormal, vNormel))), p);
	vUv = uv;
	//vUv = (normalMatrix * objectNormal).xy;
	//vUv = abs(vNormal).xy * 512.0;
	//vUv = (projectionMatrix * modelViewMatrix * vec4(position, 1.0)).xy;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}