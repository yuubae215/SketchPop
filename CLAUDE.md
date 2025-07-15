# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a single-file Three.js application that demonstrates custom 3D geometry extrusion logic. The project implements a custom extruder class that creates cuboid meshes from rectangles, comparing the custom implementation against Three.js's built-in BoxGeometry.

## Architecture

**Core Components:**
- `CustomExtruder` class: Implements manual 3D geometry creation with independent vertices per face
- Three.js scene setup with camera, lighting, and rendering pipeline
- Interactive controls for width, height, depth, and display modes (wireframe, face coloring, normal vectors)
- Real-time mesh regeneration and comparison between custom and primitive geometries

**Key Features:**
- Face-independent vertex generation (no shared vertices between faces)
- Custom normal vector calculation
- Per-face color assignment for clear visual differentiation
- Debug information display showing mesh generation details
- Side-by-side comparison with Three.js BoxGeometry

## Development

**Running the Application:**
```bash
# Serve the HTML file with any local server
python -m http.server 8000
# or
npx serve .
# or simply open index.html in a browser
```

**Code Structure:**
- All code is contained in a single `index.html` file
- Uses Three.js r128 via CDN
- Pure vanilla JavaScript with ES6 classes
- No build process or dependencies required

**Key Classes and Methods:**
- `CustomExtruder.generateVertices()`: Creates 24 independent vertices (6 faces × 4 vertices)
- `CustomExtruder.generateIndices()`: Defines triangle connectivity with proper winding order
- `CustomExtruder.generateNormals()`: Calculates vertex normals from triangle normals
- `CustomExtruder.generateVertexColors()`: Assigns distinct colors to each face

The application demonstrates advanced Three.js geometry manipulation and custom mesh creation techniques.