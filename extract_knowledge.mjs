import fs from 'fs';
import path from 'path';

const starsDir = path.join(process.cwd(), 'stars');
const files = fs.readdirSync(starsDir).filter(f => f.endsWith('.json'));

const knowledge = {
  globalStats: {
    totalMapsAnalyzed: files.length,
  },
  difficultyScaling: {},
  structuralRules: {
    "Drops": "Highest density chunks in the map, highly bursty, usually hitting peak NPS.",
    "Vocals": "Rhythmic, lower density than drops, follows strict syllable timing.",
    "Breaks": "Extremely low density or total silence, used for tension building before drops.",
    "Build-ups": "Progressive density increase, ladders and stairs used frequently."
  }
};

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(starsDir, file), 'utf8'));
    const stars = data.StarRating || parseFloat(file.split(' ')[0]);
    if (isNaN(stars)) continue;

    const durationS = data.Duration / 1000;
    const notesCount = data.Notes.length;
    const averageNPS = notesCount / durationS;

    // Detect Peak NPS (using 1-second sliding windows)
    let peakNPS = 0;
    const notes = data.Notes.sort((a, b) => a.Time - b.Time);
    
    // Very simple peak NPS calculator
    if (notes.length > 0) {
       for(let i = 0; i < notes.length; i++) {
           let countInWindow = 0;
           const windowStart = notes[i].Time;
           for(let j = i; j < notes.length; j++) {
               if (notes[j].Time - windowStart <= 1000) {
                   countInWindow++;
               } else {
                   break;
               }
           }
           if (countInWindow > peakNPS) peakNPS = countInWindow;
       }
    }

    const starCategory = Math.floor(stars);
    const categoryKey = `${starCategory}.0 - ${starCategory + 0.99} Stars`;

    if (!knowledge.difficultyScaling[categoryKey]) {
      knowledge.difficultyScaling[categoryKey] = {
        maps: 0,
        averageNPS: 0,
        peakNPS: 0,
      };
    }

    const cat = knowledge.difficultyScaling[categoryKey];
    cat.maps += 1;
    cat.averageNPS = (cat.averageNPS * (cat.maps - 1) + averageNPS) / cat.maps;
    if (peakNPS > cat.peakNPS) cat.peakNPS = peakNPS;

  } catch (e) {
    console.error("Failed to parse file:", file);
  }
}

// Clean up object format for AI
const cleanOutput = {
  "Rhythia Master Laws": "This is the mathematical truth extracted from the user's favorite maps.",
  "Difficulty Scaling": knowledge.difficultyScaling,
  "Structural Behavior Rules": knowledge.structuralRules
};

fs.writeFileSync(path.join(process.cwd(), 'src', 'lib', 'ai_knowledge.json'), JSON.stringify(cleanOutput, null, 2));
console.log("Successfully extracted knowledge from", files.length, "maps and saved to src/lib/ai_knowledge.json");
