# Evolving Realms – Planetfall

**Evolving Realms – Planetfall** is a real-time browser-based 3D graphics project built with **Three.js** and **WebGL**. The project began as a procedural environmental simulation and evolved into a polished multi-level interactive game. The final build combines procedural generation, rendering, animation, environmental hazards, object interaction, mission progression, audio, and user feedback-driven polish.

## Final Build

- **Live Demo:** https://cg-assignmment7-finalproject.netlify.app
- **Demo Video:** [Add YouTube/Vimeo link here]
- **Course:** Computer Graphics
- **Team:** Shwetha Bathina Mallikarjuna and Prithvi Govindareddy

---

## Project Overview

The goal of this project is to demonstrate how real-time computer graphics techniques can support both visual simulation and interactive gameplay. The project uses runtime-generated environments, animated visual effects, and interactive objectives to create a complete playable experience.

The game is structured into three levels:

1. **Level 1 – Beacon Mission**  
   The player controls a drone in a procedurally generated natural world. The objective is to activate stabilization beacons before disasters destroy the planet.

2. **Level 2 – City Rescue**  
   The player transitions into a city environment as Doraemon and collects Doracakes while avoiding meteor hazards and using gadgets for support.

3. **Level 3 – UFO Rescue**  
   The player rescues humans in a city under UFO attack. The level includes moving humans, rescue gadgets, red laser threats, fire effects, failure conditions, and a final rescue objective.

---

## Core Computer Graphics Pillars

### 1. Procedural Generation

The first level uses runtime procedural terrain generation. A subdivided terrain mesh is shaped using layered noise functions, creating mountains, rivers, terrain variation, and environmental structure without relying on a pre-modeled terrain asset.

Implemented procedural systems include:

- Layered noise-based terrain height generation
- River carving using distance-based terrain modification
- Procedural forest placement using instanced meshes
- Mountain shaping using radial height functions
- Runtime crater deformation from meteor impacts

### 2. Rendering

The project uses custom rendering techniques to improve visual clarity and atmosphere.

Rendering features include:

- Height-based terrain coloring
- Slope-aware terrain shading
- Dynamic day/night lighting
- Fog and atmospheric depth
- Emissive materials for beacons, gadgets, lasers, and fires
- Transparent meshes for beams, rings, shockwaves, and effects
- GLB model rendering for city, Doraemon, humans, cars, and collectibles

### 3. Animation

Animation is driven through time-based updates in the main render loop.

Animation features include:

- Expanding shockwaves after meteor impacts
- Floating and rotating beacon objects
- Animated water shader motion
- Moving meteor objects and impact particles
- Floating Doracakes and gadgets
- Moving Level 3 human characters
- UFO movement and laser targeting
- Burning/fire effects from UFO attacks

---

## Gameplay Features

### Level 1: Beacon Mission

- Procedural terrain with forest, river, mountain, and dynamic lighting
- Player-controlled drone navigation
- Beacon activation objective
- Meteor strike system
- Earthquake/quaking effect
- Crater deformation and shockwave animation
- Win/loss state system
- Start menu, HUD, warning banner, and restart flow

### Level 2: City Rescue

- City GLB environment
- Doraemon player model
- Doracake collection objective
- Proximity-based interaction
- Meteor hazards in the city
- City impact effects
- Gadgets with bonus effects
- Stabilization timer and HUD feedback
- Automatic transition to Level 3 after completion

### Level 3: UFO Rescue

- Expanded city rescue mission
- 30 human characters placed on valid city surfaces
- Human movement around safe spawn positions
- UFO object with red laser attack behavior
- Failure condition when Doraemon intersects the laser
- Fire/burning impact effects
- Rescue gadgets that automatically rescue nearby humans
- Final win condition after all humans are rescued
- Level-specific music and polished warning UI

---

## Controls

| Key / Input | Action |
|---|---|
| `Space` / `W` | Move forward |
| `S` | Move backward |
| `A` / `D` | Strafe left / right |
| `Arrow Left` / `Arrow Right` | Turn left / right |
| `Arrow Up` / `Arrow Down` | Move up / down |
| Right mouse drag | Look / turn camera |
| `F` | Interact / activate / rescue |
| `M` | Manual meteor strike |
| `E` | Toggle earthquake |
| `Q` | Quake burst |
| `R` | Restart mission |
| `T` | Toggle debug camera |
| `1` | Jump to Level 1 for testing |
| `2` | Jump to Level 2 for testing |
| `3` | Jump to Level 3 for testing |

---

## Technical Stack

- **Three.js** for 3D rendering
- **WebGL** through Three.js renderer
- **JavaScript / ES6+**
- **GLTFLoader** for loading `.glb` models
- **ShaderMaterial** for custom terrain and water rendering
- **InstancedMesh** for forest rendering optimization
- **Stats.js** for FPS monitoring
- **Vite / local development server**
- **Netlify** for web deployment

---

## Assets

The project uses a combination of procedural content and GLB assets.

Expected asset folders:

```txt
public/
  models/
    city.glb
    doraemon.glb
    doracake.glb
    human1.glb
    human2.glb
    car1.glb
    zombies.glb
  music/
    level1.mp3
    level2.mp3
    level3.mp3
```

Music files must be named exactly:

```txt
level1.mp3
level2.mp3
level3.mp3
```

Do not use spaces in the music file names.

---

## How to Run Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

### 3. Open the local URL

Vite usually opens at:

```txt
http://localhost:5173
```

If using VS Code Live Server, the project may run at:

```txt
http://localhost:5500
```

---

## Build Instructions

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## Performance and Optimization

Several optimizations were applied during the final polish phase:

- Forest objects use `InstancedMesh` to reduce draw calls.
- Terrain deformation updates occur only when needed instead of rebuilding every frame.
- Shockwave animation uses shader uniforms and lightweight visual rings.
- Level 3 human movement avoids expensive raycasting every frame.
- GLB loading includes fallback handling to avoid infinite loading screens.
- Fire and laser effects are rate-limited to reduce frame drops.
- Level 3 was reduced to 30 humans for better performance and smoother gameplay.

---

## Playtest Feedback Addressed

During the feature-complete and playtesting phase, users identified several issues:

- Some objectives were unclear.
- Camera and vertical movement needed refinement.
- Level 3 needed clearer success and failure conditions.
- Dense city scenes caused performance drops.
- UI feedback needed better visibility.

Final improvements made:

- Added clear Level 3 objective: rescue 30 humans.
- Added timer-based and laser-based failure conditions.
- Improved human placement so characters remain on valid city surfaces.
- Added rescue gadgets to make Level 3 more playable.
- Reduced Level 3 speed and movement constraints for better control.
- Added neon warning banner styling for clearer mission feedback.
- Added level-specific background music.
- Optimized Level 3 update logic to reduce lag.

---

## Known Limitations

- The city is based on a large GLB file, so initial loading may depend on browser/device performance.
- Some assets may appear differently depending on lighting and material settings.
- Collision with buildings is simplified to keep movement smooth.
- Level 3 human movement is intentionally small to preserve valid placement and performance.
- Audio playback may require user interaction due to browser autoplay restrictions.

---

## Final Project Summary

The final project successfully transforms the original procedural graphics concept into a complete three-level interactive experience. The project demonstrates procedural generation, rendering, animation, real-time interaction, environmental hazards, mission logic, UI feedback, asset integration, audio, and performance optimization.

The final build represents a complete progression from:

```txt
Procedural simulation → Playable alpha → Multi-level beta → Feature-complete game → Final polished release
```

---

## Team Members

- **Shwetha Bathina Mallikarjuna**
- **Prithvi Govindareddy**

---

## License

This project was created for academic purposes as part of a Computer Graphics course.
