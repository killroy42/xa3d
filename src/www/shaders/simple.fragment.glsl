uniform vec3 glowColor;
uniform float alpha;
//uniform sampler2D textureMap;
uniform sampler2D alphaMap;
varying vec2 vUv;
void main() {
	//vec3 rgb = texture2D(textureMap, vUv).rgb * glowColor;
	vec3 rgb = glowColor;
	float alpha = texture2D(alphaMap, vUv).r * alpha;
	gl_FragColor = vec4(rgb, alpha);
}