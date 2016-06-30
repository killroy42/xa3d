#define CUTOFF 0.5
#define ATLAS_RES vec2(16.0 / 512.0, 16.0 / 512.0);
uniform sampler2D texture;
varying vec2 spritePos;
varying vec4 fogColor;
void main() {
	vec2 coord = (gl_PointCoord + spritePos) * ATLAS_RES;
	vec4 color = texture2D(texture, coord);
	if(color.a <= 0.5) discard;
	gl_FragColor = vec4(mix(color.rgb, fogColor.rgb, fogColor.a), color.a);	
}