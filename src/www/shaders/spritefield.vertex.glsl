#define loops 10.0
attribute float age;
attribute vec3 velocity;
attribute vec3 anim;
attribute float frame;
varying vec2 spritePos;
varying vec4 fogColor;
void main() {
	vec3 pos = velocity * age;
	vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
	float size = 16.0;
	gl_PointSize = size * (256.0 / -mvPosition.z);
	gl_Position = projectionMatrix * mvPosition;
	spritePos = vec2(mod(frame, 32.0), floor(frame / 32.0));
	float dist = length(vec3(pos.xz, 0));
	float fogStrength = 1.0 - pow(1.0 - (dist / 3000.0), 3.0);
	fogColor = vec4(0.0, 0.0, 0.0, fogStrength);
}