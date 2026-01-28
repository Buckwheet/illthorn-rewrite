<script setup lang="ts">
import { computed } from 'vue';
import { useSessionStore } from '../stores/session';


const store = useSessionStore();
const session = computed(() => store.currentSession);

// Map injury levels to CSS classes
const getInjuryClass = (part: string) => {
  if (!session.value) return '';
  const level = session.value.injuries[part] || 0;
  if (level === 0) return '';
  
  if (level >= 1 && level <= 3) return `injury-${level}`;
  if (level >= 4 && level <= 6) return `scar-${level - 3}`;
  return '';
};

// We need to inject the classes into the SVG.
// Using v-html for inline SVG is okay, but we need to apply styles dynamically.
// A better approach is to load the SVG as a component or manipulate DOM, but simple binding is tricky with v-html.
// Instead, we will overlay a transparent grid OR, better, parse the SVG?
//
// EASIEST WAY: Use the SVG as a template and bind classes if built manually.
// BUT since we just created the SVG file, we can duplicate the structure here as a Vue component for full reactivity.
// This allows direct :class binding.

// Re-defining the SVG inline here for Vue reactivity power:
</script>

<template>
  <div class="injury-panel" v-if="session">
    <svg width="150" height="300" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <clipPath id="headClip">
          <ellipse cx="100" cy="50" rx="25" ry="30" />
        </clipPath>
      </defs>
      
      <!-- Head Group -->
      <g id="head-group">
        <!-- Face Image (Custom) -->
        <image 
            href="/face.png" 
            x="75" y="20" width="50" height="60" 
            preserveAspectRatio="xMidYMid slice"
            clip-path="url(#headClip)"
            style="opacity: 0.9;"
        />
        
        <!-- Head Overlay (Transparent by default, colored on injury) -->
        <ellipse 
            :class="['body-part', 'head-overlay', getInjuryClass('head')]" 
            cx="100" cy="50" rx="25" ry="30" 
            style="fill: transparent; stroke: #555; stroke-width: 1;"
        />

        <circle :class="['body-part', getInjuryClass('leftEye')]" cx="90" cy="45" r="3" />
        <circle :class="['body-part', getInjuryClass('rightEye')]" cx="110" cy="45" r="3" />
      </g>

      <!-- Neck -->
      <rect :class="['body-part', getInjuryClass('neck')]" x="90" y="80" width="20" height="15" />
      <rect :class="['body-part', getInjuryClass('nsys')]" x="98" y="95" width="4" height="95" />

      <!-- Torso -->
      <path :class="['body-part', getInjuryClass('chest')]" d="M 75 95 L 125 95 L 120 140 L 80 140 Z" />
      <rect :class="['body-part', getInjuryClass('back')]" x="75" y="95" width="50" height="95" style="fill-opacity: 0; stroke-opacity: 0.5;" /> 
      <!-- Back is visually subtle or overlaid -->
      
      <rect :class="['body-part', getInjuryClass('abdomen')]" x="80" y="140" width="40" height="50" />

      <!-- Arms -->
      <rect :class="['body-part', getInjuryClass('leftArm')]" x="45" y="100" width="30" height="80" rx="5" />
      <circle :class="['body-part', getInjuryClass('leftHand')]" cx="60" cy="190" r="10" />

      <rect :class="['body-part', getInjuryClass('rightArm')]" x="125" y="100" width="30" height="80" rx="5" />
      <circle :class="['body-part', getInjuryClass('rightHand')]" cx="140" cy="190" r="10" />

      <!-- Legs -->
      <rect :class="['body-part', getInjuryClass('leftLeg')]" x="75" y="190" width="20" height="100" rx="5" />
      <rect :class="['body-part', getInjuryClass('rightLeg')]" x="105" y="190" width="20" height="100" rx="5" />

    </svg>
    <div class="legend">
      <div class="legend-item"><span class="swatch injury-1"></span> Light</div>
      <div class="legend-item"><span class="swatch injury-2"></span> Med</div>
      <div class="legend-item"><span class="swatch injury-3"></span> Crit</div>
      <div class="legend-item"><span class="swatch scar-1"></span> Scar</div>
    </div>
  </div>
</template>

<style scoped>
.injury-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  padding: 5px; /* Reduced from 10px */
  border-radius: 8px;
  border: 1px solid #444;
}

.body-part {
  fill: #333;
  stroke: #555;
  stroke-width: 1;
  transition: all 0.3s ease;
}

/* Injury Colors */
.injury-1 { fill: #aa5500 !important; stroke: #cc6600; }
.injury-2 { fill: #ff8800 !important; stroke: #ffaa00; filter: drop-shadow(0 0 2px #ff8800); }
.injury-3 { fill: #ff0000 !important; stroke: #ff4444; filter: drop-shadow(0 0 4px #ff0000); }

/* Head Overlay Specific - Semi-Transparent so face shows through */
.head-overlay.injury-1 { fill: rgba(170, 85, 0, 0.5) !important; }
.head-overlay.injury-2 { fill: rgba(255, 136, 0, 0.5) !important; }
.head-overlay.injury-3 { fill: rgba(255, 0, 0, 0.5) !important; }

/* Scar Colors - Bright Yellow Dashed as requested */
.scar-1 { stroke: #ffff00; stroke-width: 2 !important; stroke-dasharray: 4,2; fill: transparent; }
.scar-2 { stroke: #ffff00; stroke-width: 3 !important; stroke-dasharray: 4,2; fill: transparent; }
.scar-3 { stroke: #ffff00; stroke-width: 4 !important; stroke-dasharray: 4,2; fill: transparent; }

/* Nsys specific visibility */
.nsys {
  fill: #222;
  width: 2px;
}

.legend {
  display: flex;
  gap: 8px;
  font-size: 0.7rem;
  margin-top: 5px;
  color: #aaa;
}
.swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 4px;
  border-radius: 50%;
  background: #333;
  border: 1px solid #555;
}
.swatch.injury-1 { background: #aa5500; }
.swatch.injury-2 { background: #ff8800; }
.swatch.injury-3 { background: #ff0000; }
.swatch.scar-1 { background: transparent; border-color: #ffff00; border-style: dashed; border-width: 2px; }
</style>
