var maxGainAt = 220;
var minScalePlaybackDuration = 1;
var rampLength = .015;

var audioCtx;

function Player() {
  audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();

  this.oscillator = audioCtx.createOscillator();
  this.gain = audioCtx.createGain();

  this.oscillator.connect(this.gain);
  this.gain.connect(audioCtx.destination);

  this.length = 0;
  this.gain.gain.setValueAtTime(0, audioCtx.currentTime);

  this.start = function () {
    this.oscillator.start();
    this.oscillator.stop(audioCtx.currentTime + this.length);
  };

  this.addTone = function (frequency, duration) {
    var gain = Math.min(1, maxGainAt / frequency);
    var t = audioCtx.currentTime + this.length;

    this.oscillator.frequency.setValueAtTime(frequency, t);
    this.gain.gain.linearRampToValueAtTime(gain, t + rampLength);
    this.gain.gain.setValueAtTime(gain, t + duration - rampLength);
    this.gain.gain.linearRampToValueAtTime(0, t + duration);

    this.length += duration;
    return this;
  };
}

function Scale() {
  this.fundamental = $("#fundamental").val();
  this.degrees = $("#scale").val();

  this.equalTemperamentFrequency = function (degree) {
    return this.fundamental * Math.pow(2, degree / this.degrees);
  }
}

$(function () {
  $("#playFundamental").click(function () {
    new Player().addTone(new Scale().fundamental, 1).start();
  });

  $("#playScale").click(function () {
    var scale = new Scale();

    var toneDuration = Math.max(.125, minScalePlaybackDuration / scale.degrees);

    var player = new Player();
    for (var i = 0; i < scale.degrees; ++i) {
      player.addTone(scale.equalTemperamentFrequency(i), toneDuration);
    }
    for (var i = scale.degrees; i >= 0; --i) {
      player.addTone(scale.equalTemperamentFrequency(i), toneDuration);
    }
    player.start();
  });

  $(".input-group:has(.play)").on("keypress", function (e) {
    if (e.which == 13) {
      $(this).closest(".input-group").find(".play").click();
    }
  });

  $("#scalePresets button").click(function () {
    $("#scale").val($(this).text());
    $("#playScale").click();
    updateScale();
  });

  var toneTemplate = $(".tones > *").detach();

  function updateScale() {
    var scale = new Scale();

    var tones = $(".tones");
    tones.empty();

    for (var i = 0; i <= scale.degrees; ++i) {
      var ordinalDegree = (i % scale.degrees) + 1;
      var etf = scale.equalTemperamentFrequency(i);

      var tone = toneTemplate.clone();
      tone.find(".sd-intonation").text(ordinalDegree);
      tone.find(".sd-etf").text(Math.round(etf) + " Hz");
      tones.append(tone);
    }
  }

  $("#fundamental, #scale").change(updateScale);

  updateScale();
});