uniform float iGlobalTime;
uniform vec3 iResolution;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

#define EPS 0.001
#define MAX_ITR 100
#define MAX_DIS 100.0

#define WATER_SPEED 1.
#define WATER_SCALE 1.
#define ROTATE_SPEED 1.0

#define rgb(r, g, b) vec3(float(r)/255., float(g)/255., float(b)/255.)

//Distance Functions
float sd_sph(vec3 p, float r) { return length(p) - r; }
float sd_box( vec3 p, vec3 b ) { vec3 d = abs(p) - b; return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0)); }

float sdPlane( vec3 p, vec4 n )
{
  // n must be normalized
  return dot(p,n.xyz) + n.w;
}

//Distance Map
float map(vec3 p, vec2 sc) {
	float t = iGlobalTime*0.1*ROTATE_SPEED;
	float sic = sin(t);
	float coc = cos(t);
	
	mat2 m = mat2(sic, coc, -coc, sic);
	p.xz *= m;
		
	float l = cos(length(p*2.0));
	vec2 u = vec2(l, sc.y);
	vec2 um = u*0.3;
	um.x += iGlobalTime*0.1*WATER_SPEED;
	um.y += -iGlobalTime*0.025*WATER_SPEED;
	um.x += (um.y)*2.0;    
	float a1 = texture2D(iChannel0, (p.yz * .4 + um)*WATER_SCALE).x;
	float a2 = texture2D(iChannel0, (p.zx * .4 + um)*WATER_SCALE).x;
	float a3 = texture2D(iChannel0, (p.xy * .4 + um)*WATER_SCALE).x;
	
	float t1 = a1 + a2 + a3;
	t1 /= 15.0*WATER_SCALE;
	
	float b1 = texture2D(iChannel0, (p.yz * 1. + u)*WATER_SCALE).x;
	float b2 = texture2D(iChannel0, (p.zx * 1. + u)*WATER_SCALE).x;
	float b3 = texture2D(iChannel0, (p.xy * 1. + u)*WATER_SCALE).x;
	
	float t2 = b1 + b2 + b3;
	t2 /= 15.0*WATER_SCALE;
	
	float comb = t1*0.4 + t2*0.1*(1.0-t1);
	
	return sd_box(p, vec3(1., 1., 1.)) + comb;
}

//Lighting Utils
float fresnel(float bias, float scale, float power, vec3 I, vec3 N)
{
	return bias + scale * pow(1.0 + dot(I, N), power);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy;

	float t = iGlobalTime*0.1;
	vec3 col = vec3(1.-length(uv-vec2(0.5))*.5);
	
	//Marching Setup
	vec2 d = 1.-2.*uv;
	d.x *= iResolution.x / iResolution.y;
	   
	float tdist = 0.;
	float dist  = EPS;
	
	vec3 campos = vec3(-4., -3.5, -4.);
	//campos = vec3(sin(t) * 2.0, -1.0, cos(t) * 2.0)*4.;
	vec3 pos = campos;
	
	vec3 camDir = normalize(-campos);
	vec3 camRig = normalize(cross(vec3(0, 1, 0), campos));
	vec3 camUp = cross(camDir, camRig);
	
	vec2 screenPos = -.25 + .5 * uv;
	screenPos.x *= iResolution.x / iResolution.y;
	
	vec3 raydir = normalize(camRig * screenPos.x + camUp * screenPos.y + camDir);
	raydir.y += 0.02;
	
	//Raymarching
	for(int i = 0; i < MAX_ITR; i++)
	{
		if(dist < EPS || dist > MAX_DIS)
			break;
		dist = map(pos, uv);
		tdist += dist;
		pos += dist * raydir;
	}
	//Shading
	if(dist < EPS)
	{
		vec3  lig = normalize(vec3(-1., -2, -2.5))*0.8;
		vec2 eps = vec2(0.0, EPS);
		vec3 normal = normalize(vec3(
			map(pos + eps.yxx, uv) - map(pos - eps.yxx, uv),
			map(pos + eps.xyx, uv) - map(pos - eps.xyx, uv),
			map(pos + eps.xxy, uv) - map(pos - eps.xxy, uv)
		));
		float diffuse = max(0.0, dot(lig, normal)) / 1.0;
		float specular = pow(diffuse, 256.);   

		vec3 I = normalize(pos - campos);
		float R = fresnel(0.2, 1.4, 2.0, I, normal);
		
		//vec3 r = textureCube(iChannel1, reflect(raydir, normal)).rgb;
		//vec3 r = texture2D(iChannel1, reflect(raydir, normal)).rgb;
		vec3 r = texture2D(iChannel1, reflect(raydir, normal).xy).rgb;
		//vec3 r = vec3(1.0, 1.0, 1.0);

		col = vec3(diffuse * rgb(84, 118, 145) + specular*0.1 + r*0.1 + R*0.5);
	}
	
	fragColor = vec4(col, 1.0);
}


varying vec2 vUv;
void main() {
	mainImage(gl_FragColor, vUv * iResolution.xy);
}