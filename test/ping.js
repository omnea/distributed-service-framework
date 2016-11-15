const debug = require('debug')('Omnea:SF:log');
const error = require('debug')('Omnea:SF:error');

const SF = require('../lib/app');


SF.start({name: 'ping'})
.then(service => {
    service.on('pong', 'hi', function (packet, emitter) {
        emitter.emit('hey', "MORE THAN MEETS THE EYEWith an estimated 285 million people worldwide with visual impairment, many treatments and technological innovations have long been in development. The panacea of restoring sight to the blind is the stuff of sci-fi: the bionic eye.A bionic eye, or retinal prosthesis system, works by bridging the gap between light entering the eye and the optic nerve — which is what communicates images to the brain so we can discern what we see.So far, the only US FDA-approved device is the Argus II, from a company called Second Sight. It works using a camera integrated to a pair of eyeglasses, and an implant on the surface of the eye that taps into the optical nerve. Currently, Argus II users are capable of perceiving only shadows and outlines of figures.Second Sight Medical Products' Argus II Retinal Prosthesis SystemSecond Sight Medical Products’ Argus II Retinal Prosthesis SystemAnother up-and-coming development is Melbourne’s diamond-electrode bionic eyes that may be able to perceive facial expressions and read large prints. Scientists behind the tech are are arranging for clinical testing.These bionic eye technologies don’t restore vision to a perfect level and are far from ideal, but there’s continued development that may soon get us there.A CYBORG FUTUREWhen we finally invent tech that restores perfect sight, what then? Beyond healing blindness, bionic eyes could potentially make us superhuman.Light comes in different wavelengths and humans can only see the visible spectrum made of colored light. If a bionic eye could let us see the entire electromagnetic spectrum — from radio waves to gamma waves — we’d be able to “see” heat, identify types of gases by sight, and even look through walls.We may be able to zoom in and out of our field of vision (tech that already exists), record what we see, and automatically sync it to the net with our Wi-Fi-ready eyes. It’s all speculation, but nobody can deny that innovative technology is turning science fiction into reality.VISIONS OF THE FUTUREBionic open up an array of applications in several fields: studying microbes could be done without equipment, soldiers can detect mines in a field, manual airport security could beef up surveillance — the possibilities are endless.It may be several decades before we get bionic eyes that perfectly restore visual acuity. Until then, scientists will be keeping a sharp eye out for every development.");
        return Promise.resolve();
    });
})
.catch(error);
