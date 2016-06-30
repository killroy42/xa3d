// Star Nest by Pablo Román Andrioli

// This content is under the MIT License.


//uniform vec3 iResolution;
//uniform float iGlobalTime;
//uniform float iGlobalDelta;
//uniform float iGlobalFrame;
//uniform float iChannelTime[4];
//uniform vec4 iMouse;
//uniform vec4 iDate;
//uniform float iSampleRate;
//uniform vec3 iChannelResolution[4];
//uniform samplerXX iChanneli;

#define M_PI2 2.0*3.1415926535897932384626433832795
#define M_DEGTORAD (1.0 / 360.0) * M_PI2
#define M_RADTODEG (1.0 / M_DEGTORAD)

uniform vec2 scale;
uniform float time;
uniform float iterations;
uniform float volsteps;
uniform float stepsize;
uniform float formuparam;

uniform vec3 color;
uniform float contrast;
uniform float saturation;
uniform float brightness;

uniform float distfading;
uniform float darkmatter;
uniform float darkmattercutoff;

uniform float tile;
uniform float fold;
uniform float zoom;
uniform vec3 pos;
uniform vec3 rot;

//#define iterations 17
//#define formuparam 0.53

//#define volsteps 20
//#define stepsize 0.1

//#define zoom 0.800
//#define tile 0.850
//#define speed 0.010
//#define speed 0.0

//#define brightness 0.0015
//#define darkmatter 0.300
//#define distfading 0.730
//#define saturation 0.850

// perlin
	vec4 permute( vec4 x ) {
		return mod( ( ( x * 34.0 ) + 1.0 ) * x, 289.0 );
	}
	vec4 taylorInvSqrt( vec4 r ) {
		return 1.79284291400159 - 0.85373472095314 * r;
	}
	float snoise( vec3 v ) {
		const vec2 C = vec2( 1.0 / 6.0, 1.0 / 3.0 );
		const vec4 D = vec4( 0.0, 0.5, 1.0, 2.0 );

		// First corner
		vec3 i  = floor( v + dot( v, C.yyy ) );
		vec3 x0 = v - i + dot( i, C.xxx );

		// Other corners
		vec3 g = step( x0.yzx, x0.xyz );
		vec3 l = 1.0 - g;
		vec3 i1 = min( g.xyz, l.zxy );
		vec3 i2 = max( g.xyz, l.zxy );

		vec3 x1 = x0 - i1 + 1.0 * C.xxx;
		vec3 x2 = x0 - i2 + 2.0 * C.xxx;
		vec3 x3 = x0 - 1. + 3.0 * C.xxx;

		// Permutations
		i = mod( i, 289.0 );
		vec4 p = permute( permute( permute(
				 i.z + vec4( 0.0, i1.z, i2.z, 1.0 ) )
			   + i.y + vec4( 0.0, i1.y, i2.y, 1.0 ) )
			   + i.x + vec4( 0.0, i1.x, i2.x, 1.0 ) );

		// Gradients
		// ( N*N points uniformly over a square, mapped onto an octahedron.)

		float n_ = 1.0 / 7.0; // N=7
		vec3 ns = n_ * D.wyz - D.xzx;
		vec4 j = p - 49.0 * floor( p * ns.z *ns.z );  //  mod(p,N*N)
		vec4 x_ = floor( j * ns.z );
		vec4 y_ = floor( j - 7.0 * x_ );    // mod(j,N)
		vec4 x = x_ *ns.x + ns.yyyy;
		vec4 y = y_ *ns.x + ns.yyyy;
		vec4 h = 1.0 - abs( x ) - abs( y );
		vec4 b0 = vec4( x.xy, y.xy );
		vec4 b1 = vec4( x.zw, y.zw );
		vec4 s0 = floor( b0 ) * 2.0 + 1.0;
		vec4 s1 = floor( b1 ) * 2.0 + 1.0;
		vec4 sh = -step( h, vec4( 0.0 ) );
		vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
		vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
		vec3 p0 = vec3( a0.xy, h.x );
		vec3 p1 = vec3( a0.zw, h.y );
		vec3 p2 = vec3( a1.xy, h.z );
		vec3 p3 = vec3( a1.zw, h.w );

		// Normalise gradients
		vec4 norm = taylorInvSqrt( vec4( dot( p0, p0 ), dot( p1, p1 ), dot( p2, p2 ), dot( p3, p3 ) ) );
		p0 *= norm.x;
		p1 *= norm.y;
		p2 *= norm.z;
		p3 *= norm.w;

		// Mix final noise value
		vec4 m = max( 0.6 - vec4( dot( x0, x0 ), dot( x1, x1 ), dot( x2, x2 ), dot( x3, x3 ) ), 0.0 );
		m = m * m;
		return 42.0 * dot( m*m, vec4( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 ), dot( p3, x3 ) ) );
	}
	float surface( vec3 coord ) {
		float n = 0.0;
		n += 0.7  * abs( snoise( coord ) );
		n += 0.25 * abs( snoise( coord * 2.0 ) );
		return n;
	}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
	int _iterations = int(iterations);
	int _volsteps = int(volsteps);
	//float time = 0.0;
	float _distfading = distfading;
	float _formuparam = formuparam;
	float _tile = tile;
	float _fold = fold;
	vec3 _pos = pos;
	vec3 _rot = rot;

	//float perlin = surface(vec3(fragCoord, time * 0.1));
	//_fold = mix(fold, fold * perlin, 0.5);
	//_distfading = perlin;


	//get coords and direction
	//vec2 uv = fragCoord.xy / iResolution.xy - 0.5;
	//uv.y *= iResolution.y / iResolution.x;
	//vec3 dir = vec3(uv * zoom, 1.0);

	vec2 uv = fragCoord.xy - 0.5 * scale;
	vec3 dir = vec3(uv * zoom, 1.0);
	
	//float t = time * speed;// + 0.25;

	//mouse rotation
	float a1 = _rot.x;
	float a2 = _rot.y;
	float a3 = _rot.z;
	mat2 rot1 = mat2(cos(a1), sin(a1), -sin(a1), cos(a1));
	mat2 rot2 = mat2(cos(a2), sin(a2), -sin(a2), cos(a2));
	mat2 rot3 = mat2(cos(a3), sin(a3), -sin(a3), cos(a3));
	dir.xz *= rot1;
	dir.yz *= rot2;
	dir.xy *= rot3;

	//dir = projectionMatrix * modelViewMatrix * vec4(uv, 1.0);
	//vec3 from = vec3(1.0, 0.5, 0.5);
	vec3 from = _pos;// * zoom;
	from.xz *= rot1;
	from.yz *= rot2;
	from.xy *= rot3;
	//from += vec3(t * 2.0, t, -2.0);
	//from.xz *= rot1;
	//from.xy *= rot2;
	//dir = gl_PointCoord;
	
	//volumetric rendering
	float s = 0.0, fade = 1.0;
	vec3 v = vec3(0.0);
	for (int r = 0; r < 64; r++) {
		if(r >= _volsteps) break;
		vec3 p = from + s * dir * 0.5;
		p = abs(vec3(_tile) - mod(p, vec3(_tile * _fold))); // tiling fold
		float pa, a = pa = 0.0;
		for (int i = 0; i < 64; i++) {
			if(i >= _iterations) break;
			p = abs(p) / dot(p, p) - _formuparam; // the magic formula
			a += abs(length(p) - pa); // absolute sum of average change
			pa = length(p);
		}
		float dm = max(0.0, darkmatter - a * a * 0.001); //dark matter
		a *= a * a; // add contrast
		if(float(r) > darkmattercutoff * float(_volsteps)) {
			fade *= 1.0 - dm; // dark matter, don't render near
		}
		//v += vec3(dm, dm * 0.5, 0.0);
		v += fade;
		v += vec3(s, s*s, s*s*s*s) * a * brightness * fade; // coloring based on distance
		fade *= _distfading; // distance fading
		s += stepsize;
	}

	vec3 rgb = vec3(v * 0.01);
	//rgb = mod(rgb + vec3(0.5, 0.0, 0.0), 1.0);
	rgb = mix(vec3(length(rgb)), rgb, saturation); //color adjust
	
	//float b = length(rgb);
	//rgb = mix(rgb, color, length(rgb));
	//rgb = rgb / length(rgb) * b;

	rgb = ((rgb - 0.5) * contrast + 0.5) / contrast;
	//rgb = color;
	fragColor = vec4(rgb, 1.0);
}

varying vec2 vUv;
void main() {
	mainImage(gl_FragColor, vUv);
}