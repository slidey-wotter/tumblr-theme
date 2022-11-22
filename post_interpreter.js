/*

Copyright (C) 2022, David Cardoso <slideywotter@gmail.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/
function npf_interpret (meta) {
	const wrapper = document.createElement("div");
	wrapper.className = "post-wrapper";
	root.appendChild(wrapper);

	console.log(meta.post);

	if (meta.post.trail) {
		const trail = meta.post.trail;
		for (const item of trail) {
			if (item.blog) {
				const blog = item.blog;
				const p = document.createElement("p");
				p.className = "blog-link";
				if (blog.active) { // note: most blogs marked as inactive seem to point to tumblr's 404 page url
					const a = document.createElement("a");
					a.href = blog.url;
					a.className = "blog-link";
					const img = document.createElement("img");
					img.src = "https://api.tumblr.com/v2/blog/" + blog.name + ".tumblr.com/avatar";
					img.style = "width: 1.5em; margin-right: .3em;";
					img.loading = "lazy";
					a.appendChild(img);
					a.innerHTML += blog.name;
					p.appendChild(a);
				} else {
					p.innerHTML = blog.name;
				}
				wrapper.appendChild(p);
			} else if (item.broken_blog_name) {
				const p = document.createElement("p");
				p.className = "blog-link";
				p.innerHTML = item.broken_blog_name;
				wrapper.appendChild(p);
			}
			if (item.layout.length > 0) {
				layout_interpret(wrapper, item.layout, item.content)
			} else {
				for (const block of item.content) {
					wrapper.appendChild(content_block_interpret(block));
				}
			}
		}
	}

	if (meta.post.content && meta.post.content.length > 0) {
		// pretend we have our posts as reblogs of ourselves
		// note: it is necessary for this to come after the reblog trail
		const p = document.createElement("p");
		p.className = "blog-link";
		const a = document.createElement("a");
		a.href = "slidey-wotter.tumblr.com";
		a.className = "blog-link";
		const img = document.createElement("img");
		img.src = avatar_url; // note: this must be daclared in the theme html page using tumblr's meta html
		img.style = "width: 1.5em; margin-right: .3em;";
		img.loading = "lazy";
		a.appendChild(img);
		a.innerHTML += "slidey-wotter";
		p.appendChild(a);
		wrapper.appendChild(p);
		if (meta.post.layout && meta.post.layout.length > 0) {
			layout_interpret(wrapper, meta.post.layout, meta.post.content)
		} else {
			for (const block of meta.post.content) {
				wrapper.appendChild(content_block_interpret(block));
			}
		}
	}

	const span = document.createElement("span");
	span.className = "buttons";
	span.innerHTML = meta.like_button + meta.reblog_button;
	wrapper.appendChild(span);
	if (meta.tags) {
		const p = document.createElement("p");
		p.className = "center-text";
		p.style.fontSize = ".95em";
		p.style.margin = "0 auto .2em auto";
		for (const tag of meta.tags) {
			p.innerHTML += tag;
		}
		wrapper.appendChild(p);
	}
}

function layout_interpret	(target, layout, content) {
	for (const block of layout) {
		if (block.attribution) {
			console.log("missing support: layout block attribution type " + block.attribution.type);
		}
		if (block.type == "rows") {
			for (const display of block.display) {
				if (display.mode && display.mode.type == carousel) {
					console.log("missing support: layout block type rows mode type carousel");
				}
				if (!display.blocks || !display.blocks.length) {
					continue;
				}
				if (display.blocks.length == 1) {
					target.appendChild(content_block_interpret(content[display.blocks[0]]));
					continue;
				}

				// note: i believe the npf spec defines the rows layout a bit too scalable but ok
				const span = document.createElement("span");
				span.className = "rows-layout";
				for (const index of display.blocks) {
					const node = content_block_interpret(content[index]);
					node.className = "rows-layout-item"; // note: we override this a second time here
					node.style.maxWidth = Math.trunc((1/display.blocks.length) * 100 - 5) + "%"; // note: 5% less width seems to work
					span.appendChild(node);
				}
				target.appendChild(span);
			}
		} else if (block.type == "ask") {
			console.log("missing support: layout block type ask");
		} else if (block.type == "condensed") {
			console.log("missing support: layout block type condensed");
		}
	}
}

function content_block_interpret (block) {
	if (block.attribution) {
		console.log("missing support: content block attribution type " + block.attribution.type);
	}
	switch (block.type) {
		case "text": {
			if (block.subtype) {
				console.log("missing support: content block type text subtype " + block.subtype);
			}
			const p = document.createElement("p");
			p.className = "center-text";
			if (!block.formatting) {
				p.innerHTML = block.text;
				return p;
			}
			const format_stack = Array();
			for (let format of block.formatting) {
				interpret_format(format_stack, format);
			}
			format_stack.sort((a, b) => {
				return a.position - b.position;
			});
			translate_long_character_positions(format_stack, block.text);
			let buffer = "";
			let text_format = {
				bold: false,
				italic: false,
				strikethrough: false,
				small: false,
				link: false,
				mention: false,
				color: false
			};
			let last_position = 0;
			for (const format of format_stack) {
				buffer += block.text.slice(last_position, format.position);
				last_position = format.position;
				buffer += finish_format(text_format);
				text_format[format.type] = !text_format[format.type];
				buffer += start_format(text_format, format);
			}
			buffer += block.text.slice(last_position, block.text.length);
			buffer += finish_format(text_format);
			p.innerHTML = buffer;
			return p;
		}
		case "image": {
			const picture = image_list_interpret(block.media);
			if (block.alt_text) {
				picture.alt = block.alt_text;
			}
			if (block.caption) {
				console.log("missing functionality: content type image caption");
			}
			return picture;
		}
		case "link": {
			const p = document.createElement("p");
			p.className = "center-text";
			const a = document.createElement("a");
			a.href = block.url;
			if (block.poster) {
				a.appendChild(image_list_interpret(block.poster));
			}
			if (block.title) {
				a.innerHTML += block.title;
			} else if (block.display_url) {
				a.innerHTML += block.display_url;
			} else {
				a.innerHTML += block.url;
			}
			p.appendChild(a);
			return p;
		}
		case "audio": {
			// https://github.com/tumblr/docs/blob/master/npf-spec.md#content-block-type-audio
			// Based on the provider, the waterfall the client should attempt to follow looks like:

			// 1. If there is a media object present, use the client's native player to play it.
			if (block.media) {
				const outer = document.createElement("p");
				outer.className = "center-text";
				if (block.poster) {
					outer.appendChild(image_list_interpret(block.poster));
				}
				const audio = document.createElement("audio");
				audio.controls = true;
				audio.className = "center-media";
				const source = document.createElement("source");
				source.src = block.media.url;
				audio.appendChild(source);
				outer.appendChild(audio);
				if (block.artist) {
					const p = document.createElement("p");
					p.innerHTML = block.artist;
					p.style.fontSize = "1.25em";
					outer.appendChild(p);
				}
				if (block.title) {
					if (block.album) {
						outer.innerHTML += block.title + " - " + block.album;
					} else {
						outer.innerHTML += block.title;
					}
				}
				return outer;
			}

			// 2. If there is a client-side SDK for the given provider, use the given metadata object with the client-side SDK.
			// note: we have no client-side sdk for youtube, vimeo, instagram, etc.
			// aka fallthrough

			// 3. If there is an embed_html and/or embed_url field present, render embed_html or show embed_url in an iframe.
			if (block.embed_html) {
				const span = document.createElement("span");
				span.innerHTML = block.embed_html;
				const node = span.firstChild; // note: we are assuming this is a single outer node
				node.className = "center-media";
				return node;
			}

			if (block.embed_url) {
				const iframe = document.createElement("iframe");
				iframe.src = block.embed_url;
				iframe.className = "center-media";
				return iframe;
			}

			// 4. If all else fails, just show a link to the given url.
			const a = document.createElement("a");
			a.className = "center-text";
			if (block.poster) {
				a.appendChild(image_list_interpret(block.poster));
			}
			a.href = block.url;
			a.innerHTML += block.url;
			return a;
		}
		case "video": {
			// https://github.com/tumblr/docs/blob/master/npf-spec.md#content-block-type-video
			// Based on the provider, the waterfall the client should attempt to follow looks like:

			// 1. If there is a media object present, simply use the client's native player.
			if (block.media) {
				const video = document.createElement("video");
				video.controls = true;
				video.className = "center-media";
				const source = document.createElement("source");
				source.src = block.media.url;
				video.appendChild(source);
				return video;
			}

			// 2. If there is a client-side SDK for the given provider, use the given metadata object with the client-side SDK.
			// note: we have no client-side sdk for youtube, vimeo, instagram, etc.
			// aka fallthrough

			// 3. If there is an embed_html render it.
			if (block.embed_html) {
				const span = document.createElement("span");
				span.innerHTML = block.embed_html;
				const node = span.firstChild; // note: we are assuming this is a single outer node
				node.className = "center-media";
				return node;
			}

			// 4. If there is an embed_iframe use it to construct an iframe.
			if (block.embed_iframe) {
				const iframe = document.createElement("iframe");
				iframe.url = block.embed_iframe.url;
				iframe.width = block.embed_iframe.width;
				iframe.height = block.embed_iframe.height;
				return iframe;
			}

			// 5. If there is an embed_url use it to construct an iframe.
			if (block.embed_url) {
				const iframe = document.createElement("iframe");
				iframe.src = block.embed_url;
				iframe.className = "center-media";
				return iframe;
			}

			// 6. If all else fails, just show a link to url.
			const a = document.createElement("a");
			a.className = "center-text";
			if (block.poster) {
				a.appendChild(image_list_interpret(block.poster));
			}
			a.href = block.url;
			a.innerHTML += block.url;
			return a;
		}
		case "paywall": {
			console.log("missing support: content block type paywall");
		}
	}
}

function interpret_format (format_stack, format) {
	switch (format.type) {
		case "bold": // fallthrough
		case "italic": // fallthrough
		case "strikethrough": // fallthrough
		case "small":
			// note: bold and small can be applied multiple times, perhaps
			// and we are not considering this
			return format_stack.push({ position: format.start, type: format.type }, { position: format.end, type: format.type });
		case "link":
			return format_stack.push({ position: format.start, type: format.type, url: format.url }, { position: format.end, type: format.type });
		case "mention":
			return format_stack.push({ position: format.start, type: format.type, url: format.blog.url }, { position: format.end, type: format.type });
		case "color":
			return format_stack.push({ position: format.start, type: format.type, color: format.hex }, { position: format.end, type: format.type });
	}
}

function start_format (text_format, format) {
	// note: javascript considers a sting as a primitive and
	// passes its value instead of reference in function arguments
	let buffer = "";
	if (text_format.bold) {
		buffer += "<b>";
	}
	if (text_format.italic) {
		buffer += "<i>";
	}
	if (text_format.strikethrough) {
		buffer += "<s>";
	}
	if (text_format.small) {
		buffer += "<small>";
	}
	if (text_format.link) {
		buffer += "<a href=\"" + format.url + "\">";
	}
	if (text_format.mention) {
		buffer += "<a href=\"" + format.url + "\">";
	}
	if (text_format.color) {
		buffer += "<span style=\"color: " + format.color + ";\">";
	}
	return buffer;
}

function finish_format (text_format) {
	// note: this must be the opposite order of start_format()
	// note: i hope no one tries to put a mention inside a link
	// or the opposite, even

	let buffer = "";
	if (text_format.color) {
		buffer += "</span>";
	}
	if (text_format.mention) {
		buffer += "</a>";
	}
	if (text_format.link) {
		buffer += "</a>";
	}
	if (text_format.small) {
		buffer += "</small>";
	}
	if (text_format.strikethrough) {
		buffer += "</s>";
	}
	if (text_format.italic) {
		buffer += "</i>";
	}
	if (text_format.bold) {
		buffer += "</b>";
	}
	return buffer;
}

function translate_long_character_positions (stack, text) {
	for (let i = 0, j = 0, k = 0; i < text.length; i++) {
		// iterate through the text to find the real positions

		for (;stack[k].position <= i;) {
			stack[k].position += j;
			k++;
			if (k >= stack.length) {
				return;
			}
		}

		if (text[i] >= "\ud800" && text[i] <= "\udfff") {
			i++;
			j++;
		} else if (text[i] == "\u200d") {
			i++;
			for (; text[i] != "\u200d"; i++, j++) {}
		}
	}
}

function image_list_interpret (list) {
	const picture = document.createElement("picture");
	picture.className = "center-media";
	let item;
	{
		let selected_index = 0;
		let w = 0;
		for (let i = 0; i < list.length; i++) {
			if (list[i].width > w) {
				w = list[i].width;
				selected_index = i;
			}

			const source = document.createElement("source");
			source.media = "(min-width: " + list[i].width * .75 + "px)";
			source.srcset = list[i].url;
			picture.appendChild(source);
		}
		item = list[selected_index];
	}
	const img = document.createElement("img");
	img.src = item.url;
	img.className = "center-media";
	img.loading = "lazy"; // note: picture does not support lazy loading?
	picture.appendChild(img);
	return picture;
}
