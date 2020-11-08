var maxAmplitudeAt = 220;
var minScalePlaybackDuration = 1;

function makeWindow(duration, margin) {
  return function (t) {
    return t <= 0 || t >= duration ? 0 :
      t < margin ? t / margin :
        t < duration - margin ? 1 :
          (duration - t) / margin;
  };
}

function play(duration, samplingFunction) {
  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
  var data = buffer.getChannelData(0);

  for (var i = 0; i < data.length; ++i) {
    data[i] = samplingFunction(i / audioCtx.sampleRate);
  }

  var source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
}

function tone(frequency, duration) {
  var amplitude = Math.min(1, maxAmplitudeAt / frequency);
  var windowFn = makeWindow(duration, .05 * duration);

  return function (t) {
    return amplitude * Math.sin(2 * Math.PI * frequency * t) * windowFn(t);
  };
}

$(function () {
  $("#playFundamental").click(function () {
    var frequency = $("#fundamental").val();
    play(1, tone(frequency, 1));
  });

  $("#playScale").click(function () {
    var fundamental = $("#fundamental").val();
    var degrees = $("#scale").val();

    var toneDuration = Math.max(.125, minScalePlaybackDuration / degrees);

    var tones = [];
    for (var i = 0; i <= 2 * degrees; ++i) {
      (function () {
        var degree = i < degrees ? i : 2 * degrees - i;
        var toneFn = tone(fundamental * Math.pow(2, degree / degrees), toneDuration);
        var offset = i * toneDuration;
        tones.push(function (t) { return toneFn(t - offset); });
      })();
    }

    play((2 * degrees + 1) * toneDuration, function (t) {
      var i = Math.min(Math.floor(t / toneDuration), tones.length);
      return tones[i](t);
    });
  });

  $(".input-group:has(.play)").on("keypress", function (e) {
    if (e.which == 13) {
      $(this).closest(".input-group").find(".play").click();
    }
  });

  $("#scalePresets button").click(function () {
    $("#scale").val($(this).text());
    $("#playScale").click();
  });
});