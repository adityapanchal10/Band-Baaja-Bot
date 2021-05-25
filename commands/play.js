const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");
const ytpl = require("ytpl");
let query, id;
let flag = false;
let urllist = [];
let songlist = [];

async function play(msg, args) {
	const { guild, channel, member } = msg;
	id = msg.client.id;
	const shuffle = msg.client.shuffle;
	// console.log("S_id " + id);

	const voiceChannel = member.voice.channel;
	if (!voiceChannel)
		return channel.send("Need to be connected in a voice channel.");

	const perm = voiceChannel.permissionsFor(msg.client.user);
	if (!perm.has("CONNECT") || !perm.has("SPEAK"))
		return channel.send("You do not have necessary permissions.");

	const serverQueue = msg.client.queue.get(guild.id);
	const queue = msg.client.queue;

	const videoFinder = async (query) => {
		const videoResult = await ytSearch(query);
		return videoResult.videos.length > 1 ? videoResult.videos[0] : null;
	};

	// console.log(args);

	if (isPlaylist(args)) {
		const response = await ytpl(args);
		if (!response)
			return msg.channel.send("Encountered a problem with the url :/");
		const list = response.items;
		list.forEach((element) => {
			urllist.push(element.shortUrl);
		});
		// console.log(urllist);
		console.log("Yt playlist url found.");

		for (let item of urllist) {
			const songInfo = await ytdl.getInfo(item);
			if (!songInfo)
				return msg.channel.send("Encountered a problem with the song :/");
			var song = {
				id: id,
				title: songInfo.videoDetails.title,
				url: songInfo.videoDetails.video_url,
			};
			songlist.push(song);
			id++;
		}

		console.log("Songs retrieved and pushed successfully.");
		// console.log(songlist);
		msg.client.id = id;

		if (!serverQueue) {
			const queueConstruct = {
				textChannel: channel,
				voiceChannel: voiceChannel,
				connection: null,
				songs: [],
				volume: 1,
				playing: true,
				i: 0,
				jump: -1,
			};

			queue.set(guild.id, queueConstruct);

			queueConstruct.songs = songlist;

			queueConstruct.textChannel.send("🎼 Youtube playlist found !!");

			try {
				var connection = await voiceChannel.join();
				queueConstruct.connection = connection;
				playy(msg, queueConstruct.songs[queueConstruct.i++]);
			} catch (err) {
				console.log(err);
				queue.delete(guild.id);
				return channel.send(err);
			}
		} else {
			const songz = serverQueue.songs;
			let a = serverQueue.i;
			songlist.forEach((element) => {
				element.id = ++a;
			});
			serverQueue.songs = songz.concat(songlist);
			console.log(serverQueue.songs);

			if (serverQueue.songs.length === songlist.length) {
				playy(msg, serverQueue.songs[serverQueue.i++]);
			} else return channel.send(`🎼 Playlist has been added to the queue!`);
		}

		urllist = [];
		songlist = [];
	} else {
		const video = await videoFinder(args);
		if (matchYoutubeUrl(args)) {
			console.log("URL found !");
			query = args;
		} else {
			query = video.url;
		}

		const songInfo = await ytdl.getInfo(query);
		const song = {
			id: id,
			title: songInfo.videoDetails.title,
			url: songInfo.videoDetails.video_url,
		};
		id++;
		msg.client.id = id;
		// console.log("R_id " + id);

		console.log("Song found and pushed !");

		if (!serverQueue) {
			const queueConstruct = {
				textChannel: channel,
				voiceChannel: voiceChannel,
				connection: null,
				songs: [],
				volume: 1,
				playing: true,
				i: 0,
				jump: -1,
			};

			queue.set(guild.id, queueConstruct);

			queueConstruct.songs.push(song);

			try {
				var connection = await voiceChannel.join();
				queueConstruct.connection = connection;
				playy(msg, queueConstruct.songs[queueConstruct.i++]);
			} catch (err) {
				console.log(err);
				queue.delete(guild.id);
				return channel.send(err);
			}
		} else {
			serverQueue.songs.push(song);
			if (serverQueue.songs.length === 1) {
				playy(msg, serverQueue.songs[serverQueue.i++]);
			} else
				return channel.send(
					`🎶 **${song.title}** has been added to the queue!`
				);
		}
	}
}

function playy(msg, song) {
	const queue = msg.client.queue;
	const guild = msg.guild;
	const serverQueue = queue.get(guild.id);

	console.log("Now playing: ");
	console.log(serverQueue.i);
	console.log(song);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		serverQueue.textChannel.send(`Finished playing. ✨`);
		msg.client.id = 1;
		return;
	}

	const stream = ytdl(song.url, {
		filter: "audioonly",
		quality: "highestaudio",
	});

	const dispatcher = serverQueue.connection
		.play(stream, { seek: 0, volume: 1 })
		.on("finish", () => {
			if (msg.client.shuffle) {
				if (serverQueue.jump != -1) {
					serverQueue.i = serverQueue.jump;
					serverQueue.jump = -1;
				} else serverQueue.i = randInt(0, serverQueue.songs.length);
				playy(msg, serverQueue.songs[serverQueue.i++]);
			} else playy(msg, serverQueue.songs[serverQueue.i++]);
		});
	serverQueue.textChannel.send(`🎶 Now playing: **${song.title}**`);
}

function matchYoutubeUrl(url) {
	var p = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
	if (url.match(p)) return true;
	return false;
}

function isPlaylist(url) {
	var q = /^.*(youtu.be\/|list=)([^#\&\?]*).*/;
	if (url.match(q)) {
		flag = true;
		return true;
	}
	return false;
}

function randInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = play;
