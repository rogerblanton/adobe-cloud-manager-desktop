<template>
  <div class="loading-container" :class="{ hide: !show }">
    <coral-wait centered></coral-wait>
  </div>
</template>

<script>
  import { loadingStore } from "./LoadingStore";

  export default {
    name: "Loading",
    computed: {
      show() {
        return loadingStore.show;
      }
    }
  };
</script>

<style scoped>
  .hide {
    display: none;
  }
  .loading-container {
    position: absolute;
    top: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgb(245, 245, 245);
    z-index: 99999999; /* oldest trick in the book */
  }
</style>
