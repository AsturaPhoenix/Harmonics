var maxGainAt = 220;
var minScalePlaybackDuration = 1;
var rampLength = .015;

var register = 4;
var audioCtx;

function Player() {
  audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();

  var oscillator = audioCtx.createOscillator();
  var gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  var length = 0;
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

  this.start = function () {
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + length);
  };

  this.addTone = function (frequency, duration) {
    var gain = Math.min(1, maxGainAt / frequency);
    var t = audioCtx.currentTime + length;

    oscillator.frequency.setValueAtTime(frequency, t);
    gainNode.gain.linearRampToValueAtTime(gain, t + rampLength);
    gainNode.gain.setValueAtTime(gain, t + duration - rampLength);
    gainNode.gain.linearRampToValueAtTime(0, t + duration);

    length += duration;
    return this;
  };
}

function Scale() {
  this.fundamental = $("#tonic").val() / Math.pow(2, register);
  this.degrees = $("#scale").val();

  this.equalTemperamentFrequency = function (degree) {
    return this.fundamental * Math.pow(2, register + degree / this.degrees);
  };

  this.harmonicFrequency = function (harmonic) {
    return this.fundamental * harmonic;
  }

  this.toDegree = function (harmonic) {
    return (Math.log2(harmonic) - register) * this.degrees;
  };
}

function ScaleDegree(selector, scale, degree) {
  var etf = scale.equalTemperamentFrequency(degree);
  var absIntonation;

  selector.find(".sd-degree").text((degree % scale.degrees) + 1);
  selector.find(".sd-etf").text(Math.round(etf));

  function formatIntonation(intonation) {
    return intonation > 0 ? "+ " + intonation.toFixed(2).substr(1) :
      intonation < 0 ? "- " + intonation.toFixed(2).substr(2) :
        "± .00";
  }

  function factorHarmonic(harmonic) {
    var exp = 0;
    while (harmonic % 2 == 0) {
      ++exp;
      harmonic >>= 1;
    }
    return {
      odd: harmonic,
      exp: exp
    };
  }

  this.addHarmonic = function (harmonic) {
    var intonation = scale.toDegree(harmonic) - degree;

    if (!(absIntonation < Math.abs(intonation))) {
      absIntonation = Math.abs(intonation);
      var factored = factorHarmonic(harmonic);

      selector.find(".sd-intonation, .sd-harmonic-info").removeClass("d-none");
      selector.removeClass("list-group-item-secondary list-group-item-success list-group-item-warning list-group-item-danger");

      selector.find(".sd-harmonic").text(harmonic);
      selector.find(".sd-intonation").text(formatIntonation(intonation));
      selector.find(".sd-harmonic-odd").text(factored.odd);
      selector.find(".sd-harmonic-exp").text(factored.exp);
      selector.find(".sd-jif").text(Math.round(scale.harmonicFrequency(harmonic)) + " Hz");
    }
  };
}

$(function () {
  $("#playTonic").click(function () {
    new Player().addTone($("#tonic").val(), 1).start();
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

  $(".shift-register .btn").click(function () {
    register += $(this).data("registerShift");
    $(".shift-register .btn[data-register-shift='-1']").attr("disabled", register == 0);
    updateScale();
  });

  var toneTemplate = $(".tones > *").detach();

  function updateScale() {
    var scale = new Scale();

    var tones = $(".tones");
    tones.empty();

    var scaleDegrees = [];

    for (var i = 0; i <= scale.degrees; ++i) {
      var tone = toneTemplate.clone();
      scaleDegrees.push(new ScaleDegree(tone, scale, i));
      tones.append(tone);
    }

    var h0 = Math.pow(2, register);
    for (var n = h0; n <= 2 * h0; ++n) {
      scaleDegrees[Math.round(scale.toDegree(n))].addHarmonic(n);
    }
  }

  $("#tonic, #scale").change(updateScale);

  updateScale();
});