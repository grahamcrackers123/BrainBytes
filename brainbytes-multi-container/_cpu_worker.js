
  const start = Date.now();
  const duration = parseInt(process.argv[2], 10) * 1000;
  while (Date.now() - start < duration) {
    for (let i = 0; i < 1000000; i++) {
      Math.random() * Math.random();
    }
  }
  process.exit(0);
