uniform float iGlobalTime;
uniform vec3 iResolution;
uniform vec2 iMouse;

varying vec2 vUv;

uniform float SEA_CHOPPY;
uniform float SEA_FREQ;
uniform float SEA_HEIGHT;
uniform float SEA_SPEED;

const int ITER_FRAGMENT_MAX = 10;
uniform int ITER_FRAGMENT;
const int ITER_GEOMETRY_MAX = 10;
uniform int ITER_GEOMETRY;
const int NUM_STEPS_MAX = 30;
uniform int NUM_STEPS;

uniform vec3 ori;
uniform vec3 ang;

/*
"Seascape" by Alexander Alekseev aka TDM - 2014
License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
Contact: tdmaav@gmail.com
*/

//const int NUM_STEPS = 8;
const float PI	 	= 3.1415;
const float EPSILON	= 1e-3;

// sea
//const int ITER_GEOMETRY = 3;
//const int ITER_FRAGMENT = 5;
//const float SEA_HEIGHT = 0.6;
//const float SEA_CHOPPY = 4.0;
//const float SEA_SPEED = 0.8;
//const float SEA_FREQ = 0.16;
const vec3 SEA_BASE = vec3(0.1,0.19,0.22);
const vec3 SEA_WATER_COLOR = vec3(0.8,0.9,0.6);

// math
mat3 fromEuler(vec3 ang) {
	vec2 a1 = vec2(sin(ang.x),cos(ang.x));
	vec2 a2 = vec2(sin(ang.y),cos(ang.y));
	vec2 a3 = vec2(sin(ang.z),cos(ang.z));
	mat3 m;
	m[0] = vec3(a1.y*a3.y+a1.x*a2.x*a3.x,a1.y*a2.x*a3.x+a3.y*a1.x,-a2.y*a3.x);
	m[1] = vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
	m[2] = vec3(a3.y*a1.x*a2.x+a1.y*a3.x,a1.x*a3.x-a1.y*a3.y*a2.x,a2.y*a3.y);
	return m;
}
float hash( vec2 p ) {
	float h = dot(p,vec2(127.1,311.7));	
	return fract(sin(h)*43758.5453123);
}
float noise( in vec3 uvt ) {
	vec2 p = uvt.xy;
	vec2 ft = fract(uvt.z * vec2(1.0, 1.0));
	vec2 i = floor(p+ft) + floor(uvt.z);
	vec2 f = fract( p +ft );
	vec2 u = f*f*(3.0-2.0*f);
	return -1.0+2.0*mix( mix( hash( i + vec2(0.0,0.0) ), 
					 hash( i + vec2(1.0,0.0) ), u.x),
				mix( hash( i + vec2(0.0,1.0) ), 
					 hash( i + vec2(1.0,1.0) ), u.x), u.y);
}

// lighting
float diffuse(vec3 n,vec3 l,float p) {
	return pow(dot(n,l) * 0.4 + 0.6,p);
}
float specular(vec3 n,vec3 l,vec3 e,float s) {    
	float nrm = (s + 8.0) / (3.1415 * 8.0);
	return pow(max(dot(reflect(e,n),l),0.0),s) * nrm;
}

// sky
vec3 getSkyColor(vec3 e) {
	e.y = max(e.y,0.0);
	vec3 ret;
	ret.x = pow(1.0-e.y,2.0);
	ret.y = 1.0-e.y;
	ret.z = 0.6+(1.0-e.y)*0.4;
	return ret;
}

// sea
float sea_octave(vec3 uvt, float choppy) {
	vec2 uv = uvt.xy;// + uvt.z;
	uv += noise(uvt);
	vec2 cost = cos(uvt.z * vec2(1.0, 1.0));
	vec2 sint = sin(uvt.z * vec2(1.0, 1.0));
	vec2 wv = 1.0-abs(sin(uv)*cost  + sint*cos(uv) );
	vec2 swv = abs(cos(uv)*cost - sin(uv)*sint);    
	
	wv = mix(wv,swv,wv);
	return pow(1.0-pow(wv.x * wv.y,0.65),choppy);
}

float map(vec3 p) {
	float SEA_TIME = iGlobalTime * SEA_SPEED;
	mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);
	//SEA_TIME = 0.0;
	float freq = SEA_FREQ;
	float amp = SEA_HEIGHT;
	float choppy = SEA_CHOPPY;
	vec3 uvt = vec3(p.xz, SEA_TIME);
	uvt.x *= 0.75;
	float d, h = 0.0;
	for(int i = 0; i < ITER_GEOMETRY_MAX; i++) {
		if(i >= ITER_GEOMETRY) break;
		d = sea_octave((uvt)*freq, choppy);
		d += sea_octave((uvt)*freq, choppy);
		h += d * amp;
		uvt.xy *= octave_m;
		freq *= 1.9;
		amp *= 0.22;
		choppy = mix(choppy, 1.0, 0.2);
	}
	return p.y - h;
}

float map2d(vec2 p) {
	float SEA_TIME = iGlobalTime * SEA_SPEED;
	mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);
	//SEA_TIME = 0.0;
	float freq = SEA_FREQ;
	float amp = SEA_HEIGHT;
	float choppy = SEA_CHOPPY;
	vec3 uvt = vec3(p.xy, SEA_TIME);
	uvt.x *= 0.75;
	float d, h = 0.0;
	for(int i = 0; i < ITER_GEOMETRY_MAX; i++) {
		if(i >= ITER_GEOMETRY) break;
		d = sea_octave((uvt)*freq, choppy);
		d += sea_octave((uvt)*freq, choppy);
		h += d * amp;
		uvt.xy *= octave_m;
		freq *= 1.9;
		amp *= 0.22;
		choppy = mix(choppy, 1.0, 0.2);
	}
	return h;
}

float map_detailed(vec3 p) {
	float SEA_TIME = iGlobalTime * SEA_SPEED;
	mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);
	//SEA_TIME = 0.0;
	float freq = SEA_FREQ;
	float amp = SEA_HEIGHT;
	float choppy = SEA_CHOPPY;
	vec3 uvt = vec3(p.xz, SEA_TIME); uvt.x *= 0.75;
	float d, h = 0.0;
	for(int i = 0; i < ITER_FRAGMENT_MAX; i++) {
		if(i >= ITER_FRAGMENT) break;       
		d = sea_octave((uvt)*freq, choppy);
		d += sea_octave((uvt)*freq, choppy);
		h += d * amp;        
		uvt.xy*= octave_m; freq *= 1.9; amp *= 0.22;
		choppy = mix(choppy, 1.0, 0.2);
	}
	return p.y - h;
}

vec3 getSeaColor(vec3 p, vec3 n, vec3 l, vec3 eye, vec3 dist) {  
	float fresnel = 1.0 - max(dot(n, -eye), 0.0);
	fresnel = pow(fresnel,3.0) * 0.65;
		
	vec3 reflected = getSkyColor(reflect(eye,n));    
	vec3 refracted = SEA_BASE + diffuse(n,l,80.0) * SEA_WATER_COLOR * 0.12; 
	
	vec3 color = mix(refracted, reflected, fresnel);
	
	float atten = max(1.0 - dot(dist, dist) * 0.001, 0.0);
	//float atten = 0.0;
	color += SEA_WATER_COLOR * (p.y - SEA_HEIGHT) * 0.18 * atten;
	
	color += vec3(specular(n,l,eye,60.0));
	
	return color;
}

// tracing
vec3 getNormal(vec3 p, float eps) {
	vec3 n;
	n.y = map_detailed(p);    
	n.x = map_detailed(vec3(p.x+eps, p.y, p.z)) - n.y;
	n.z = map_detailed(vec3(p.x, p.y, p.z+eps)) - n.y;
	n.y = eps;
	return normalize(n);
}

float heightMapTracing(vec3 ori, vec3 dir, out vec3 p) {  
	float tm = 0.0;
	float tx = 1000.0;
	float hx = map(ori + dir * tx);
	if(hx > 0.0) return tx;   
	float hm = map(ori + dir * tm);    
	float tmid = 0.0;
	for(int i = 0; i < NUM_STEPS_MAX; i++) {
		if(i >= NUM_STEPS) break;
		tmid = mix(tm, tx, hm/(hm-hx));
		//tmid = tx;
		p = ori + dir * tmid;
		float hmid = map(p);
		if(hmid < 0.0) {
			tx = tmid;
			hx = hmid;
		} else {
			tm = tmid;
			hm = hmid;
		}
		
	}
	return tmid;
}

// main
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
	float EPSILON_NRM	= 0.1 / iResolution.x;
	mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);

	vec2 uv = fragCoord.xy / iResolution.xy;
	uv = uv * 2.0 - 1.0;
	uv.x *= iResolution.x / iResolution.y;    
	//float time = iGlobalTime * 0.3 + iMouse.x*0.01;
	float time = iGlobalTime;

	//time = 0.0;
		
	// ray
	//vec3 ang = vec3(sin(time*3.0)*0.1, sin(time)*0.2+0.3, time);
	//vec3 ang = vec3(0.0, 90.0 * PI / 180.0, 0.0);
	//vec3 ang = vec3(offsetx, offsety, offsetz);
	vec3 radAng = ang * (PI / 180.0);

	//vec3 ori = vec3(0.0, 3.5, time*5.0);
	//vec3 ori = vec3(0.0, 3.5, time*0.0);
	//vec3 ori = vec3(0.0, 3.5, 0.0);
	//vec3 ori = vec3(0.01, 0.01, 0.0);
	//ori *= 10.0;
	//vec3 ori = vec3(1.0 - offsetx, offsetz, -offsety);

	vec3 dir = normalize(vec3(uv.xy, -2.0));
	//vec3 dir = normalize(vec3(uv.xy, -2.0));
	//dir.z += length(uv) * 0.15;
	dir = normalize(dir) * fromEuler(radAng);

	//dir = vec3(0.0, 0.0, -1.0);
	
	// tracing
	vec3 p;
	float v = heightMapTracing(ori, dir, p);
	//float v = map(vec3(uv.x, 1.0, uv.y));
	//float v = map2d(uv);
	//p = vec3(uv.xy, 1.0 - v);
	p = vec3(p.y);

	/*
	vec3 dist = p - ori;
	vec3 n = getNormal(p, dot(dist, dist) * EPSILON_NRM);
	vec3 light = normalize(vec3(0.0, 1.0, 0.8)); 
			 
	//dist = vec3(0.0, 0.0, 0.0);

	// color
	vec3 skyColor = getSkyColor(dir);
	vec3 seaColor = getSeaColor(p, n, light, dir, dist);

	//skyColor = vec3(1.0);

	vec3 color = mix(
		skyColor,
		seaColor,
		pow(smoothstep(0.0, -0.05, dir.y), 0.3)
	);
	*/
	vec3 color = p;
		
	// post
	fragColor = vec4(pow(color, vec3(0.75)), 1.0);
}


void main() {
	mainImage(gl_FragColor, vUv * iResolution.xy);
}