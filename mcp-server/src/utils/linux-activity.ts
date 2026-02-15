
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type ActivityStatus = 
  | "PROCURING" // Procrastinating (Video/Music)
  | "CODING"
  | "GAMING"
  | "IDLE"
  | "UNKNOWN";

export interface ActivityState {
  status: ActivityStatus;
  appName: string;
  details: string;
}

// 1. Check if specific processes are running
async function getRunningProcesses(): Promise<Set<string>> {
  try {
    // Get list of command names only
    const { stdout } = await execAsync("ps -e -o comm=");
    // Filter out empty lines and whitespace
    return new Set(stdout.split("\n").map(s => s.trim()).filter(s => s.length > 0));
  } catch (error) {
    console.error("Error listing processes:", error);
    return new Set();
  }
}

// 2. Check if specific applications are playing audio
async function getAudioPlayingApps(): Promise<string[]> {
  try {
    // pactl list sink-inputs provides info on applystreams
    const { stdout } = await execAsync("pactl list sink-inputs");
    
    // Split output into blocks for each sink input
    // Each block starts with "Sink Input #"
    const blocks = stdout.split(/Sink Input #\d+/);
    
    const activeApps = new Set<string>();

    for (const block of blocks) {
        if (!block.trim()) continue;

        // check if Corked: yes (paused) or Mute: yes
        const isCorked = block.includes("Corked: yes");
        const isMuted = block.includes("Mute: yes");

        if (isCorked || isMuted) {
            continue; // Skip if not actually playing audio
        }

        // Extract application.process.binary or application.name
        // properties are indented, sometimes multiple lines
        const binaryMatch = block.match(/application\.process\.binary\s*=\s*"([^"]+)"/);
        const nameMatch = block.match(/application\.name\s*=\s*"([^"]+)"/);
        const mediaNameMatch = block.match(/media\.name\s*=\s*"([^"]+)"/);

        // Prioritize binary name as it's most reliable
        if (binaryMatch) {
            activeApps.add(binaryMatch[1].toLowerCase());
        } else if (nameMatch) {
             activeApps.add(nameMatch[1].toLowerCase());
        } else if (mediaNameMatch) {
             // Fallback for some apps
             activeApps.add(mediaNameMatch[1].toLowerCase());
        }
    }

    return Array.from(activeApps);
  } catch (error) {
    // pactl might fail if not installed or no audio subsystem
    return [];
  }
}

// 3. Main Heuristic Function
export async function detectActivityState(): Promise<ActivityState> {
  const [processSet, audioApps] = await Promise.all([
    getRunningProcesses(),
    getAudioPlayingApps()
  ]);

  // --- Strict Procrastination Checks ---
  
  // Heuristic 1: Browser playing audio implies video watching or music
  const browsers = ["firefox", "chrome", "chromium", "brave", "opera", "microsoft-edge", "vivaldi"];
  for (const app of audioApps) {
    if (browsers.some(b => app.includes(b))) {
      return {
        status: "PROCURING",
        appName: app, // e.g. "firefox"
        details: "Browser playing audio (Video/Music)"
      };
    }
  }

  // Heuristic 2: Known media players playing audio
  const mediaPlayers = ["spotify", "vlc", "rhythmbox", "mpv", "totem"];
  for (const app of audioApps) {
    if (mediaPlayers.some(p => app.includes(p))) {
        return {
            status: "PROCURING",
            appName: app,
            details: "Media player active"
        };
    }
  }

  // --- Productivity Checks ---

  // Heuristic 3: Coding tools running
  // We check for running process names
  // Note: 'code' is VS Code. 'cursor' is Cursor editor. 
  const codingApps = ["code", "code-oss", "cursor", "webstorm", "intellij", "pycharm", "sublime_text", "atom", "vim", "nvim"];
  
  // Find if any coding app is running
  const runningCodingApp = codingApps.find(app => processSet.has(app));
  
  if (runningCodingApp) {
      // If code is running, we assume productivity if no distracting audio is playing
      return {
          status: "CODING",
          appName: runningCodingApp === "code" ? "VS Code" : runningCodingApp,
          details: "Code editor is running"
      };
  }

  // --- Gaming Checks ---
  
  if (processSet.has("steam") || processSet.has("steam_app")) {
     return {
         status: "GAMING",
         appName: "Steam",
         details: "Steam client is running"
     };
  }
  
  // Check for other common game launchers or games
  const gameProcesses = ["lutris", "heroic", "wineserver", "minecraft-launcher"];
  const runningGame = gameProcesses.find(p => processSet.has(p));
  if (runningGame) {
      return {
          status: "GAMING",
          appName: runningGame,
          details: "Game launcher running"
      };
  }

  // --- Fallback ---

  // If discord is open but no coding happening?
  // Checking exact process name 'Discord' might be tricky case sensitivity wise, 
  // ps -e -o comm= usually output lower case or as launched. Often 'Discord'.
  if (processSet.has("discord") || processSet.has("Discord")) {
      return {
          status: "PROCURING", // Or maybe IDLE? 
          appName: "Discord",
          details: "Discord is running without coding tools"
      };
  }

  return {
    status: "UNKNOWN",
    appName: "Unknown",
    details: "No specific activity detected"
  };
}
