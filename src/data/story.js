export const chapters = {
  arrival: ["01 / The Archive", "Night shift", "Find Mara by the window and speak with her."],
  archive: ["01 / The Archive", "Three clicks", "Read the archive notes. Test the spare receiver at the Radio, compare its reply with the tape, then return to Mara."],
  lesson: ["02 / The Lesson", "On the record", "Walk to the Terminal and practice a reply."],
  trial: ["03 / The Trial", "Different ears", "Finish the two trial calls at the Terminal."],
  ready: ["04 / The First Call", "A quiet handover", "Speak to Mara before taking over the night shift."],
  live: ["04 / The First Call", "Incoming", "Pick up the live call at the Terminal."],
  investigation: ["04 / The First Call", "A familiar signal", "Use the Radio, Archive or rescue board if you want to investigate. Return to the Terminal to reply."],
  ending: ["04 / The First Call", "Still here", "The line is open. Nell knows where to find you."],
};


export const exercises = [
  {
    label: "Mara · Practice call", title: "The late ferry",
    request: "“My sister is still waiting at the pier. Do you know when the ferry will arrive?”",
    fact: "Dispatch log · The ferry is delayed. Arrival time pending.",
    options: [
      { trait: "caution", text: "The ferry is delayed. We haven’t received an arrival time yet." },
      { trait: "warmth", text: "It’s hard to be left waiting. I’ll pass along the next update." },
      { trait: "confidence", text: "Tell your sister the ferry should be there soon." },
    ],
    preferred: "caution",
    feedback: "Mara’s sample reply · “The ferry is delayed. We don’t have an arrival time yet, but I can call the pier when we get one.”",
  },
  {
    label: "Trial · Caller 01", title: "The red light",
    request: "“The east marker’s gone dark. I’ve got my kids with me. Can we still come in?”",
    fact: "Harbor log · The marker is out. The harbor master has not cleared the entrance.",
    options: [
      { trait: "caution", text: "Hold outside until we get a clearance from the harbor master." },
      { trait: "warmth", text: "I know it’s unsettling out there. I’ll stay on the line while we wait for clearance." },
      { trait: "confidence", text: "You should be fine to come in. Keep an eye out for the pier." },
    ],
    preferred: "warmth",
    feedback: "Caller feedback · “Knowing someone was staying with us would help. It’s hard to sit out here with the radio quiet.”",
  },
  {
    label: "Trial · Caller 02", title: "The supply run",
    request: "“I’m holding up a delivery. Is the west dock clear yet?”",
    fact: "Harbor log · The crew is checking the west dock. The result is pending.",
    options: [
      { trait: "caution", text: "The crew is checking it now. I’ll relay the result when it comes in." },
      { trait: "warmth", text: "I know you’re in a hurry. I’ll stay available while you wait." },
      { trait: "confidence", text: "Go ahead and line up for the west dock. It should be clear by the time you reach it." },
    ],
    preferred: "confidence",
    feedback: "Caller feedback · “I liked having something definite to do. ‘Wait for a report’ is hard to work with.”",
  },
];

