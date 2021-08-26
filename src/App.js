import React, { useState } from 'react';
import {
  ChakraProvider,
  IconButton,
  Box,
  Grid,
  Text,
  VStack,
  Container,
  Select,
  theme,
} from '@chakra-ui/react';
import { ColorModeSwitcher } from './ColorModeSwitcher';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from "@chakra-ui/react"
import { MdEqualizer, MdPlayCircleFilled, MdPauseCircleFilled } from 'react-icons/md';

import workerScript from './worker';
import NoSleep from 'nosleep.js';

const noSleep = new NoSleep();

document.addEventListener('click', function enableNoSleep() {
  document.removeEventListener('click', enableNoSleep, false);
  noSleep.enable();
}, false);

const timerWorker = new Worker(workerScript);

function App() {
  const [tempo, setTempo] = useState(60);
  const [noteResolution, setNoteResolution] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  var audioContext = new AudioContext();
  var current16thNote = -1;        // What note is currently last scheduled?
  var scheduleAheadTime = 0.1;    // How far ahead to schedule audio (sec)
  // This is calculated from lookahead, and overlaps
  // with next interval (in case the timer is late)
  var nextNoteTime = 0.0;     // when the next note is due.

  var noteLength = 0.05;      // length of "beep" (in seconds)
  var notesInQueue = [];      // the notes that have been put into the web audio,
  // and may or may not have played yet. {note, time}

  timerWorker.onmessage = function(e) {
    if (e.data === "tick") {
      console.log("tick");
      scheduler();
    }
  };

  const nextNote = () => {
    // Advance current note and time by a 16th note...
    var secondsPerBeat = 60.0 / tempo;    // Notice this picks up the CURRENT
    // tempo value to calculate beat length.
    nextNoteTime += 0.25 * secondsPerBeat;    // Add beat length to last beat time

    current16thNote++;    // Advance the beat number, wrap to zero
    if (current16thNote === 16) {
      current16thNote = 0;
    }
  }

  const scheduleNote = (beatNumber, time) => {
    // push the note on the queue, even if we're not playing.
    notesInQueue.push({ note: beatNumber, time: time });

    if ((noteResolution === 8) && (beatNumber % 2 !== 0)) return; // we're not playing non-8th 16th notes
    if ((noteResolution === 4) && (beatNumber % 4 !== 0)) return; // we're not playing non-quarter 8th notes

    // create an oscillator
    var osc = audioContext.createOscillator();
    osc.connect(audioContext.destination);
    if (beatNumber % 16 === 0)    // beat 0 == high pitch
      osc.frequency.value = 880.0;
    else if (beatNumber % 4 === 0)    // quarter notes = medium pitch
      osc.frequency.value = 440.0;
    else                        // other 16th notes = low pitch
      osc.frequency.value = 220.0;

    console.log(noteResolution, beatNumber);
    osc.start(time);
    osc.stop(time + noteLength);
  }

  const scheduler = () => {
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
      scheduleNote(current16thNote, nextNoteTime);
      nextNote();
    }
  }

  function play() {
    if (!unlocked) {
      // play silent buffer to unlock the audio
      var buffer = audioContext.createBuffer(1, 1, 22050);
      var node = audioContext.createBufferSource();
      node.buffer = buffer;
      node.start(0);
      setUnlocked(true);
    }

    if (!isPlaying) { // start playing
      current16thNote = 0;
      nextNoteTime = audioContext.currentTime;
      timerWorker.postMessage("start");
    } else {
      timerWorker.postMessage("stop");
    }

    setIsPlaying(!isPlaying);
  }

  return (
    <ChakraProvider theme={theme}>
      <Container>
        <Box textAlign="center" fontSize="xl">
          <Grid minH="100vh" p={3}>
            <ColorModeSwitcher justifySelf="flex-end" />
            <VStack spacing={8}>
              <IconButton
                onClick={play}
                color="tomato"
                aria-label="Play/Pause"
                h={400}
                w={400}
                fontSize={500}
                variant="ghost"
                icon={isPlaying ? <MdPauseCircleFilled /> : <MdPlayCircleFilled />}
              />
              <Text fontSize="xl">{tempo} bpm</Text>
              <Slider aria-label="slider-ex-4" defaultValue={tempo} min={0} max={250} onChange={(newTempo) => setTempo(newTempo)}>
                <SliderTrack bg="red.100">
                  <SliderFilledTrack bg="tomato" />
                </SliderTrack>
                <SliderThumb boxSize={6}>
                  <Box color="tomato" as={MdEqualizer} />
                </SliderThumb>
              </Slider>
              <Select onChange={(e) => { setNoteResolution(parseInt(e.target.value)); }}>
                <option value={4}>4</option>
                <option value={8}>8</option>
                <option value={16}>16</option>
              </Select>
            </VStack>
          </Grid >
        </Box >
      </Container>
    </ChakraProvider >
  );
}

export default App;
