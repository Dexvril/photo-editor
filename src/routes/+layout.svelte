<script>
	import '../app.css';
	let { children } = $props();
</script>

<div class="h-screen w-screen flex flex-col overflow-hidden bg-editor-bg text-editor-text">
	{@render children()}
</div>
